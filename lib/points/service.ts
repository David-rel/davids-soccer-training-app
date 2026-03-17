import "server-only";

import { sql } from "@/db";
import {
  DEFAULT_POINTS_RULE_CONFIG,
  SESSION_ACTIVITY_TYPES,
  SHOP_ITEMS_BY_ID,
  SHIRT_LEVELS,
  RUNTIME_SHOP_ITEMS,
} from "@/lib/points/constants";
import {
  evaluateShopItemStatus,
  getShirtRank,
  resolveShirtLevel,
  resolveTierLevel,
} from "@/lib/points/policy";
import { sendSmsViaTwilio } from "@/lib/twilio";
import type {
  AdminOrderRow,
  PointsRuleConfig,
  PointsStateView,
  PurchaseFailureReason,
  ShopItemView,
} from "@/lib/points/types";

type PlayerOwnershipRow = {
  id: string;
  name: string;
  parent_id: string;
};

type BalanceRow = {
  player_id: string;
  training_xp: number;
  credits: number;
  shirt_level: string;
  tier_level: string;
};

type UsageRow = {
  item_key: string;
  used_lifetime: number;
  used_this_month: number;
};

type RuleRow = {
  xp_to_credits_pct: string;
  weekly_non_session_cap: number;
  freeze_non_session_without_monthly_session: boolean;
  shirt_threshold_multiplier: string;
  shop_price_multiplier: string;
};

type PurchaseInsertRow = {
  purchase_id: string;
  purchased_at: string;
  credits_remaining: number;
};

const ARIZONA_TZ = "America/Phoenix";

export class PointsPurchaseError extends Error {
  reason: PurchaseFailureReason;

  constructor(reason: PurchaseFailureReason, message: string) {
    super(message);
    this.reason = reason;
  }
}

async function getOwnedPlayer(parentId: string, playerId: string) {
  const rows = (await sql`
    SELECT id, name, parent_id
    FROM players
    WHERE id = ${playerId}
      AND parent_id = ${parentId}
    LIMIT 1
  `) as unknown as PlayerOwnershipRow[];

  return rows[0] ?? null;
}

async function getPlayerById(playerId: string) {
  const rows = (await sql`
    SELECT id, name, parent_id
    FROM players
    WHERE id = ${playerId}
    LIMIT 1
  `) as unknown as PlayerOwnershipRow[];

  return rows[0] ?? null;
}

export async function ensurePointsBalance(playerId: string) {
  await sql`
    INSERT INTO points_balances (player_id, training_xp, credits, shirt_level, tier_level)
    VALUES (${playerId}, 0, 0, 'No Shirt', 'Igniter')
    ON CONFLICT (player_id) DO NOTHING
  `;
}

export async function getPointsRuleConfig(): Promise<PointsRuleConfig> {
  const rows = (await sql`
    SELECT
      xp_to_credits_pct,
      weekly_non_session_cap,
      freeze_non_session_without_monthly_session,
      shirt_threshold_multiplier,
      shop_price_multiplier
    FROM points_rule_config
    WHERE id = 1
    LIMIT 1
  `) as unknown as RuleRow[];

  const row = rows[0];
  if (!row) {
    return DEFAULT_POINTS_RULE_CONFIG;
  }

  return {
    xpToCreditsPct: Number(row.xp_to_credits_pct),
    weeklyNonSessionCap: row.weekly_non_session_cap,
    freezeNonSessionWithoutMonthlySession:
      row.freeze_non_session_without_monthly_session,
    shirtThresholdMultiplier: Number(row.shirt_threshold_multiplier),
    shopPriceMultiplier: Number(row.shop_price_multiplier),
  };
}

async function getPlayerBalance(playerId: string) {
  const rows = (await sql`
    SELECT player_id, training_xp, credits, shirt_level, tier_level
    FROM points_balances
    WHERE player_id = ${playerId}
    LIMIT 1
  `) as unknown as BalanceRow[];

  return rows[0] ?? null;
}

async function getTotalAwardedSessions(playerId: string) {
  const rows = (await sql`
    SELECT COUNT(*)::int AS total
    FROM points_activity_events e
    JOIN points_awards a ON a.event_id = e.id
    WHERE e.player_id = ${playerId}
      AND e.activity_type IN (
        ${SESSION_ACTIVITY_TYPES[0]},
        ${SESSION_ACTIVITY_TYPES[1]},
        ${SESSION_ACTIVITY_TYPES[2]}
      )
      AND a.xp_awarded > 0
  `) as unknown as Array<{ total: number }>;

  return rows[0]?.total ?? 0;
}

async function getWeeklyNonSessionUsed(playerId: string) {
  const rows = (await sql`
    SELECT COALESCE(SUM(a.xp_awarded), 0)::int AS total
    FROM points_activity_events e
    JOIN points_awards a ON a.event_id = e.id
    WHERE e.player_id = ${playerId}
      AND e.activity_type NOT IN (
        ${SESSION_ACTIVITY_TYPES[0]},
        ${SESSION_ACTIVITY_TYPES[1]},
        ${SESSION_ACTIVITY_TYPES[2]}
      )
      AND (e.event_at AT TIME ZONE ${ARIZONA_TZ}) >= date_trunc('week', (NOW() AT TIME ZONE ${ARIZONA_TZ}))
      AND (e.event_at AT TIME ZONE ${ARIZONA_TZ}) < (date_trunc('week', (NOW() AT TIME ZONE ${ARIZONA_TZ})) + INTERVAL '7 days')
  `) as unknown as Array<{ total: number }>;

  return rows[0]?.total ?? 0;
}

export async function getPointsStateForPlayer(playerId: string): Promise<PointsStateView> {
  await ensurePointsBalance(playerId);

  const [config, balance, totalAwardedSessions, weeklyNonSessionUsed] =
    await Promise.all([
      getPointsRuleConfig(),
      getPlayerBalance(playerId),
      getTotalAwardedSessions(playerId),
      getWeeklyNonSessionUsed(playerId),
    ]);

  if (!balance) {
    throw new Error("Points balance not found.");
  }

  const shirt = resolveShirtLevel(
    balance.training_xp,
    totalAwardedSessions,
    config.shirtThresholdMultiplier,
  );
  const tier = resolveTierLevel(
    balance.training_xp,
    totalAwardedSessions,
    config.shirtThresholdMultiplier,
  );

  if (balance.shirt_level !== shirt.name || balance.tier_level !== tier.name) {
    await sql`
      UPDATE points_balances
      SET shirt_level = ${shirt.name}, tier_level = ${tier.name}, updated_at = now()
      WHERE player_id = ${playerId}
    `;
  }

  return {
    playerId,
    trainingXp: balance.training_xp,
    credits: balance.credits,
    shirtLevel: shirt.name,
    titleLevel: tier.name,
    weeklyNonSessionCap: config.weeklyNonSessionCap,
    weeklyNonSessionUsed,
    weeklyNonSessionRemaining: Math.max(
      config.weeklyNonSessionCap - weeklyNonSessionUsed,
      0,
    ),
    totalAwardedSessions,
  };
}

export async function getParentPointsState(parentId: string, playerId: string) {
  const player = await getOwnedPlayer(parentId, playerId);
  if (!player) {
    throw new Error("Not found");
  }

  return getPointsStateForPlayer(playerId);
}

export async function getAdminPointsState(playerId: string) {
  const player = await getPlayerById(playerId);
  if (!player) {
    throw new Error("Not found");
  }

  return getPointsStateForPlayer(playerId);
}

async function getItemUsageRows(playerId: string) {
  const rows = (await sql`
    SELECT
      item_key,
      COUNT(*)::int AS used_lifetime,
      COUNT(*) FILTER (
        WHERE (purchased_at AT TIME ZONE ${ARIZONA_TZ}) >= date_trunc('month', (NOW() AT TIME ZONE ${ARIZONA_TZ}))
          AND (purchased_at AT TIME ZONE ${ARIZONA_TZ}) < (date_trunc('month', (NOW() AT TIME ZONE ${ARIZONA_TZ})) + INTERVAL '1 month')
      )::int AS used_this_month
    FROM points_purchases
    WHERE player_id = ${playerId}
    GROUP BY item_key
  `) as unknown as UsageRow[];

  return rows;
}

async function getItemUsageForPlayer(playerId: string, itemKey: string) {
  const rows = (await sql`
    SELECT
      COUNT(*)::int AS used_lifetime,
      COUNT(*) FILTER (
        WHERE (purchased_at AT TIME ZONE ${ARIZONA_TZ}) >= date_trunc('month', (NOW() AT TIME ZONE ${ARIZONA_TZ}))
          AND (purchased_at AT TIME ZONE ${ARIZONA_TZ}) < (date_trunc('month', (NOW() AT TIME ZONE ${ARIZONA_TZ})) + INTERVAL '1 month')
      )::int AS used_this_month
    FROM points_purchases
    WHERE player_id = ${playerId}
      AND item_key = ${itemKey}
  `) as unknown as Array<{ used_lifetime: number; used_this_month: number }>;

  return {
    usedLifetime: rows[0]?.used_lifetime ?? 0,
    usedThisMonth: rows[0]?.used_this_month ?? 0,
  };
}

async function listShopItemsForPlayer(playerId: string): Promise<ShopItemView[]> {
  const [pointsState, config, usageRows] = await Promise.all([
    getPointsStateForPlayer(playerId),
    getPointsRuleConfig(),
    getItemUsageRows(playerId),
  ]);

  const usageByKey = new Map(
    usageRows.map((row) => [row.item_key, row]),
  );

  return [...RUNTIME_SHOP_ITEMS]
    .map((item) => {
      const usage = usageByKey.get(item.itemKey);
      const usedLifetime = usage?.used_lifetime ?? 0;
      const usedThisMonth = usage?.used_this_month ?? 0;
      const status = evaluateShopItemStatus({
        item,
        playerShirt: pointsState.shirtLevel,
        playerShirtRank: getShirtRank(pointsState.shirtLevel),
        usedLifetime,
        usedThisMonth,
      });

      return {
        id: item.id,
        itemKey: item.itemKey,
        name: item.name,
        category: item.category,
        rarity: item.rarity,
        description: item.description,
        unlockShirt: item.unlockShirt,
        itemType: item.itemType,
        effectivePrice: Math.max(
          1,
          Math.round(item.priceCredits * config.shopPriceMultiplier),
        ),
        effectiveRepeatLimit: status.effectiveRepeatLimit,
        monthlyCap: status.effectiveMonthlyCap,
        usedThisMonth,
        usedLifetime,
        status: status.status,
        statusReason: status.statusReason,
      } satisfies ShopItemView;
    })
    .sort((a, b) => {
      const shirtSort = getShirtRank(a.unlockShirt) - getShirtRank(b.unlockShirt);
      if (shirtSort !== 0) return shirtSort;
      const itemA = SHOP_ITEMS_BY_ID.get(a.id);
      const itemB = SHOP_ITEMS_BY_ID.get(b.id);
      const sortOrderDiff = (itemA?.sortOrder ?? 0) - (itemB?.sortOrder ?? 0);
      if (sortOrderDiff !== 0) return sortOrderDiff;
      return a.effectivePrice - b.effectivePrice;
    });
}

export async function getParentShopItems(parentId: string, playerId: string) {
  const player = await getOwnedPlayer(parentId, playerId);
  if (!player) {
    throw new Error("Not found");
  }

  return listShopItemsForPlayer(playerId);
}

export async function getAdminShopItems(playerId: string) {
  const player = await getPlayerById(playerId);
  if (!player) {
    throw new Error("Not found");
  }

  return listShopItemsForPlayer(playerId);
}

async function recordPurchaseNotification(input: {
  purchaseId: string;
  targetPhone: string | null;
  status: "sent" | "failed";
  twilioMessageSid?: string | null;
  twilioStatus?: string | null;
  errorMessage?: string | null;
}) {
  await sql`
    INSERT INTO points_purchase_notifications (
      purchase_id,
      channel,
      target_phone,
      status,
      twilio_message_sid,
      twilio_status,
      error_message
    )
    VALUES (
      ${input.purchaseId},
      'sms',
      ${input.targetPhone},
      ${input.status},
      ${input.twilioMessageSid ?? null},
      ${input.twilioStatus ?? null},
      ${input.errorMessage ?? null}
    )
  `;
}

export async function createParentShopPurchase(input: {
  parentId: string;
  playerId: string;
  itemId: number;
}) {
  const player = await getOwnedPlayer(input.parentId, input.playerId);
  if (!player) {
    throw new PointsPurchaseError("not_found", "Player not found.");
  }

  const item = SHOP_ITEMS_BY_ID.get(input.itemId);
  if (!item) {
    throw new PointsPurchaseError("not_found", "Shop item not found.");
  }

  const [pointsState, config, usage] = await Promise.all([
    getPointsStateForPlayer(input.playerId),
    getPointsRuleConfig(),
    getItemUsageForPlayer(input.playerId, item.itemKey),
  ]);

  const status = evaluateShopItemStatus({
    item,
    playerShirt: pointsState.shirtLevel,
    playerShirtRank: getShirtRank(pointsState.shirtLevel),
    usedLifetime: usage.usedLifetime,
    usedThisMonth: usage.usedThisMonth,
  });

  if (status.status === "locked") {
    throw new PointsPurchaseError(
      "unlock_required",
      status.statusReason ?? "This item is locked.",
    );
  }

  if (status.status === "cap_reached") {
    if (item.itemType === "discount") {
      throw new PointsPurchaseError(
        "monthly_cap_reached",
        status.statusReason ?? "Monthly cap reached.",
      );
    }
    throw new PointsPurchaseError(
      "repeat_limit_reached",
      status.statusReason ?? "Repeat limit reached.",
    );
  }

  const effectivePrice = Math.max(
    1,
    Math.round(item.priceCredits * config.shopPriceMultiplier),
  );

  if (pointsState.credits < effectivePrice) {
    throw new PointsPurchaseError(
      "insufficient_credits",
      "Not enough Credits for this purchase.",
    );
  }

  const inserted = (await sql`
    WITH debited AS (
      UPDATE points_balances
      SET credits = credits - ${effectivePrice}, updated_at = now()
      WHERE player_id = ${input.playerId}
        AND credits >= ${effectivePrice}
      RETURNING credits
    ),
    inserted AS (
      INSERT INTO points_purchases (
        player_id,
        purchased_by_parent_id,
        item_id,
        item_key,
        item_name,
        item_type,
        unlock_shirt,
        credits_spent,
        status
      )
      SELECT
        ${input.playerId},
        ${input.parentId},
        NULL,
        ${item.itemKey},
        ${item.name},
        ${item.itemType},
        ${item.unlockShirt},
        ${effectivePrice},
        'completed'
      FROM debited
      RETURNING id, purchased_at::text AS purchased_at
    )
    SELECT
      inserted.id AS purchase_id,
      inserted.purchased_at,
      debited.credits AS credits_remaining
    FROM inserted
    JOIN debited ON TRUE
  `) as unknown as PurchaseInsertRow[];

  const created = inserted[0];
  if (!created) {
    throw new PointsPurchaseError(
      "insufficient_credits",
      "Not enough Credits for this purchase.",
    );
  }

  const smsTarget =
    String(process.env.ORDER_ALERT_TO_PHONE ?? "").trim() ||
    String(process.env.SIGNED_DOCUMENT_ALERT_TO_PHONE ?? "").trim() ||
    String(process.env.BIRTHDAY_ALERT_TO_PHONE ?? "").trim() ||
    null;

  const purchasedAtLabel = new Date(created.purchased_at).toLocaleString("en-US", {
    timeZone: ARIZONA_TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const smsBody = `Shop order: ${player.name} bought ${item.name} for ${effectivePrice} credits (${purchasedAtLabel} AZ).`;

  if (!smsTarget) {
    await recordPurchaseNotification({
      purchaseId: created.purchase_id,
      targetPhone: null,
      status: "failed",
      errorMessage: "ORDER_ALERT_TO_PHONE is not configured.",
    });
  } else {
    try {
      const sms = await sendSmsViaTwilio(smsBody, { to: smsTarget });
      await recordPurchaseNotification({
        purchaseId: created.purchase_id,
        targetPhone: smsTarget,
        status: "sent",
        twilioMessageSid: sms.sid,
        twilioStatus: sms.status,
      });
    } catch (error) {
      await recordPurchaseNotification({
        purchaseId: created.purchase_id,
        targetPhone: smsTarget,
        status: "failed",
        errorMessage:
          error instanceof Error
            ? error.message
            : "Unknown SMS notification failure.",
      });
    }
  }

  return {
    purchaseId: created.purchase_id,
    itemName: item.name,
    creditsSpent: effectivePrice,
    creditsRemaining: created.credits_remaining,
  };
}

export async function listAdminOrders(): Promise<AdminOrderRow[]> {
  const rows = (await sql`
    SELECT
      p.id,
      p.purchased_at::text AS purchased_at,
      p.player_id,
      pl.name AS player_name,
      p.purchased_by_parent_id,
      pr.name AS parent_name,
      pr.email AS parent_email,
      p.item_key,
      p.item_name,
      p.item_type,
      p.unlock_shirt,
      p.credits_spent,
      p.status,
      n.status AS notification_status,
      n.target_phone AS notification_phone,
      n.twilio_message_sid AS notification_twilio_sid,
      n.twilio_status AS notification_twilio_status,
      n.error_message AS notification_error
    FROM points_purchases p
    JOIN players pl ON pl.id = p.player_id
    LEFT JOIN parents pr ON pr.id = p.purchased_by_parent_id
    LEFT JOIN LATERAL (
      SELECT
        status,
        target_phone,
        twilio_message_sid,
        twilio_status,
        error_message
      FROM points_purchase_notifications
      WHERE purchase_id = p.id
      ORDER BY created_at DESC
      LIMIT 1
    ) n ON TRUE
    ORDER BY p.purchased_at DESC
    LIMIT 1000
  `) as unknown as Array<{
    id: string;
    purchased_at: string;
    player_id: string;
    player_name: string;
    purchased_by_parent_id: string | null;
    parent_name: string | null;
    parent_email: string | null;
    item_key: string;
    item_name: string;
    item_type: "physical" | "discount" | "vip";
    unlock_shirt: string;
    credits_spent: number;
    status: string;
    notification_status: "sent" | "failed" | null;
    notification_phone: string | null;
    notification_twilio_sid: string | null;
    notification_twilio_status: string | null;
    notification_error: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    purchasedAt: row.purchased_at,
    playerId: row.player_id,
    playerName: row.player_name,
    parentId: row.purchased_by_parent_id,
    parentName: row.parent_name,
    parentEmail: row.parent_email,
    itemKey: row.item_key,
    itemName: row.item_name,
    itemType: row.item_type,
    unlockShirt: row.unlock_shirt,
    creditsSpent: row.credits_spent,
    status: row.status,
    notificationStatus: row.notification_status,
    notificationPhone: row.notification_phone,
    notificationTwilioSid: row.notification_twilio_sid,
    notificationTwilioStatus: row.notification_twilio_status,
    notificationError: row.notification_error,
  }));
}

export function getDefaultShirtAndTier() {
  return {
    shirtLevel: SHIRT_LEVELS[0].name,
    titleLevel: "Igniter",
  };
}
