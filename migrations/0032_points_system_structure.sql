CREATE TABLE IF NOT EXISTS points_shirt_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  min_xp INTEGER NOT NULL CHECK (min_xp >= 0),
  max_xp INTEGER,
  rank_order INTEGER NOT NULL UNIQUE CHECK (rank_order > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points_tier_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  min_xp INTEGER NOT NULL CHECK (min_xp >= 0),
  max_xp INTEGER,
  rank_order INTEGER NOT NULL UNIQUE CHECK (rank_order > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points_rule_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  xp_to_credits_pct NUMERIC(5,2) NOT NULL DEFAULT 40.0 CHECK (xp_to_credits_pct >= 0),
  weekly_non_session_cap INTEGER NOT NULL DEFAULT 25 CHECK (weekly_non_session_cap >= 0),
  freeze_non_session_without_monthly_session BOOLEAN NOT NULL DEFAULT TRUE,
  shirt_threshold_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1.0 CHECK (shirt_threshold_multiplier > 0),
  shop_price_multiplier NUMERIC(6,3) NOT NULL DEFAULT 1.0 CHECK (shop_price_multiplier > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points_balances (
  player_id UUID PRIMARY KEY REFERENCES players(id) ON DELETE CASCADE,
  training_xp INTEGER NOT NULL DEFAULT 0 CHECK (training_xp >= 0),
  credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
  shirt_level TEXT NOT NULL DEFAULT 'No Shirt',
  tier_level TEXT NOT NULL DEFAULT 'Igniter',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points_activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points_awards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL UNIQUE REFERENCES points_activity_events(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  xp_requested INTEGER NOT NULL DEFAULT 0,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  credits_awarded INTEGER NOT NULL DEFAULT 0,
  capped BOOLEAN NOT NULL DEFAULT FALSE,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  block_reason TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points_shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  rarity TEXT NOT NULL,
  description TEXT NOT NULL,
  price_credits INTEGER NOT NULL CHECK (price_credits > 0),
  unlock_shirt TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('physical', 'discount', 'vip')),
  base_repeat_limit INTEGER,
  monthly_cap INTEGER,
  repeat_scales_with_tier BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  purchased_by_parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
  item_id UUID REFERENCES points_shop_items(id) ON DELETE SET NULL,
  item_key TEXT NOT NULL,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('physical', 'discount', 'vip')),
  unlock_shirt TEXT NOT NULL,
  credits_spent INTEGER NOT NULL CHECK (credits_spent > 0),
  status TEXT NOT NULL DEFAULT 'completed',
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS points_purchase_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id UUID NOT NULL REFERENCES points_purchases(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'sms',
  target_phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('sent', 'failed')),
  twilio_message_sid TEXT,
  twilio_status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS points_activity_events_player_event_at_idx
  ON points_activity_events(player_id, event_at DESC);
CREATE INDEX IF NOT EXISTS points_awards_player_created_at_idx
  ON points_awards(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS points_purchases_player_purchased_at_idx
  ON points_purchases(player_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS points_purchases_item_key_idx
  ON points_purchases(item_key);
CREATE INDEX IF NOT EXISTS points_purchases_parent_purchased_at_idx
  ON points_purchases(purchased_by_parent_id, purchased_at DESC);
CREATE INDEX IF NOT EXISTS points_purchase_notifications_purchase_created_at_idx
  ON points_purchase_notifications(purchase_id, created_at DESC);
CREATE INDEX IF NOT EXISTS points_shop_items_unlock_sort_idx
  ON points_shop_items(unlock_shirt, sort_order, price_credits);

DROP TRIGGER IF EXISTS points_shirt_levels_set_updated_at ON points_shirt_levels;
CREATE TRIGGER points_shirt_levels_set_updated_at
BEFORE UPDATE ON points_shirt_levels
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS points_tier_levels_set_updated_at ON points_tier_levels;
CREATE TRIGGER points_tier_levels_set_updated_at
BEFORE UPDATE ON points_tier_levels
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS points_rule_config_set_updated_at ON points_rule_config;
CREATE TRIGGER points_rule_config_set_updated_at
BEFORE UPDATE ON points_rule_config
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS points_balances_set_updated_at ON points_balances;
CREATE TRIGGER points_balances_set_updated_at
BEFORE UPDATE ON points_balances
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS points_shop_items_set_updated_at ON points_shop_items;
CREATE TRIGGER points_shop_items_set_updated_at
BEFORE UPDATE ON points_shop_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION ensure_points_balance_on_player_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO points_balances (player_id)
  VALUES (NEW.id)
  ON CONFLICT (player_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS players_ensure_points_balance ON players;
CREATE TRIGGER players_ensure_points_balance
AFTER INSERT ON players
FOR EACH ROW EXECUTE FUNCTION ensure_points_balance_on_player_insert();
