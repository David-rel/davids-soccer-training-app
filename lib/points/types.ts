export type PointsRuleConfig = {
  xpToCreditsPct: number;
  weeklyNonSessionCap: number;
  freezeNonSessionWithoutMonthlySession: boolean;
  shirtThresholdMultiplier: number;
  shopPriceMultiplier: number;
};

export type ShirtLevel = {
  name: string;
  minXp: number;
  maxXp: number | null;
  rank: number;
};

export type TierLevel = {
  name: string;
  minXp: number;
  maxXp: number | null;
  rank: number;
};

export type PointsActivityType =
  | "private_session"
  | "group_session"
  | "online_film_session"
  | "watch_assigned_video"
  | "upload_video_review"
  | "coach_set_goal"
  | "beat_test_minor"
  | "beat_test_clear"
  | "beat_major_benchmark"
  | "complete_task"
  | "reach_self_set_goal"
  | "repeat_same_goal";

export type ShopItemType = "physical" | "discount" | "vip";
export type ShopItemStatus = "locked" | "available" | "cap_reached";

export type RuntimeShopItem = {
  id: number;
  itemKey: string;
  name: string;
  category: string;
  rarity: string;
  description: string;
  priceCredits: number;
  unlockShirt: string;
  itemType: ShopItemType;
  baseRepeatLimit: number | null;
  monthlyCap: number | null;
  repeatScalesWithTier: boolean;
  sortOrder: number;
};

export type ShopItemView = {
  id: number;
  itemKey: string;
  name: string;
  category: string;
  rarity: string;
  description: string;
  unlockShirt: string;
  itemType: ShopItemType;
  effectivePrice: number;
  effectiveRepeatLimit: number | null;
  monthlyCap: number | null;
  usedThisMonth: number;
  usedLifetime: number;
  status: ShopItemStatus;
  statusReason: string | null;
};

export type PointsStateView = {
  playerId: string;
  trainingXp: number;
  credits: number;
  shirtLevel: string;
  titleLevel: string;
  weeklyNonSessionCap: number;
  weeklyNonSessionUsed: number;
  weeklyNonSessionRemaining: number;
  totalAwardedSessions: number;
};

export type PurchaseFailureReason =
  | "unlock_required"
  | "monthly_cap_reached"
  | "repeat_limit_reached"
  | "insufficient_credits"
  | "not_found";

export type AdminOrderRow = {
  id: string;
  purchasedAt: string;
  playerId: string;
  playerName: string;
  parentId: string | null;
  parentName: string | null;
  parentEmail: string | null;
  itemKey: string;
  itemName: string;
  itemType: ShopItemType;
  unlockShirt: string;
  creditsSpent: number;
  status: string;
  notificationStatus: "sent" | "failed" | null;
  notificationPhone: string | null;
  notificationTwilioSid: string | null;
  notificationTwilioStatus: string | null;
  notificationError: string | null;
};
