import {
  DISCOUNT_SHIRT_MONTHLY_CAP,
  SHIRT_LEVELS,
  TIER_LEVELS,
} from "@/lib/points/constants";
import type {
  RuntimeShopItem,
  ShopItemStatus,
  ShirtLevel,
  TierLevel,
} from "@/lib/points/types";

export function getShirtRank(name: string) {
  const found = SHIRT_LEVELS.find((shirt) => shirt.name === name);
  return found?.rank ?? 1;
}

export function resolveShirtLevel(
  trainingXp: number,
  totalAwardedSessions: number,
  shirtThresholdMultiplier: number,
): ShirtLevel {
  if (totalAwardedSessions < 3) {
    return SHIRT_LEVELS[0];
  }

  const normalizedXp = Math.floor(trainingXp / shirtThresholdMultiplier);
  return (
    [...SHIRT_LEVELS]
      .reverse()
      .find((shirt) => normalizedXp >= shirt.minXp) ?? SHIRT_LEVELS[0]
  );
}

export function resolveTierLevel(
  trainingXp: number,
  totalAwardedSessions: number,
  shirtThresholdMultiplier: number,
): TierLevel {
  if (totalAwardedSessions < 3) {
    return TIER_LEVELS[0];
  }

  const normalizedXp = Math.floor(trainingXp / shirtThresholdMultiplier);
  return (
    [...TIER_LEVELS]
      .reverse()
      .find((tier) => normalizedXp >= tier.minXp) ?? TIER_LEVELS[0]
  );
}

export function calculateEffectiveRepeatLimit(input: {
  item: RuntimeShopItem;
  playerShirtRank: number;
}) {
  if (input.item.baseRepeatLimit === null) {
    return null;
  }

  if (!input.item.repeatScalesWithTier) {
    return input.item.baseRepeatLimit;
  }

  const unlockRank = getShirtRank(input.item.unlockShirt);
  const rankDelta = Math.max(input.playerShirtRank - unlockRank, 0);
  return Math.min(input.item.baseRepeatLimit + rankDelta, 4);
}

export function calculateEffectiveMonthlyCap(input: {
  item: RuntimeShopItem;
  playerShirt: string;
}) {
  if (input.item.itemType !== "discount") {
    return null;
  }

  const shirtCap = DISCOUNT_SHIRT_MONTHLY_CAP[input.playerShirt] ?? null;
  const itemCap = input.item.monthlyCap;

  if (shirtCap === null && itemCap === null) {
    return null;
  }

  if (shirtCap === null) {
    return itemCap;
  }

  if (itemCap === null) {
    return shirtCap;
  }

  return Math.max(shirtCap, itemCap);
}

export function evaluateShopItemStatus(input: {
  item: RuntimeShopItem;
  playerShirt: string;
  playerShirtRank: number;
  usedLifetime: number;
  usedThisMonth: number;
}): {
  status: ShopItemStatus;
  statusReason: string | null;
  effectiveRepeatLimit: number | null;
  effectiveMonthlyCap: number | null;
} {
  const unlockRank = getShirtRank(input.item.unlockShirt);
  const effectiveRepeatLimit = calculateEffectiveRepeatLimit({
    item: input.item,
    playerShirtRank: input.playerShirtRank,
  });
  const effectiveMonthlyCap = calculateEffectiveMonthlyCap({
    item: input.item,
    playerShirt: input.playerShirt,
  });

  if (input.playerShirt === "No Shirt" || input.playerShirtRank < unlockRank) {
    return {
      status: "locked",
      statusReason: `Unlocks at ${input.item.unlockShirt}.`,
      effectiveRepeatLimit,
      effectiveMonthlyCap,
    };
  }

  if (
    input.item.itemType === "discount" &&
    effectiveMonthlyCap !== null &&
    input.usedThisMonth >= effectiveMonthlyCap
  ) {
    return {
      status: "cap_reached",
      statusReason: "Monthly discount cap reached.",
      effectiveRepeatLimit,
      effectiveMonthlyCap,
    };
  }

  if (
    effectiveRepeatLimit !== null &&
    input.usedLifetime >= effectiveRepeatLimit
  ) {
    return {
      status: "cap_reached",
      statusReason: "Lifetime repeat limit reached for this item.",
      effectiveRepeatLimit,
      effectiveMonthlyCap,
    };
  }

  return {
    status: "available",
    statusReason: null,
    effectiveRepeatLimit,
    effectiveMonthlyCap,
  };
}
