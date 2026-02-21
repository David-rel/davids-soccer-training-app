CREATE TABLE IF NOT EXISTS group_sessions (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  session_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  price NUMERIC(10, 2),
  curriculum TEXT,
  max_players INTEGER NOT NULL DEFAULT 0 CHECK (max_players >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_group_sessions_session_date
  ON group_sessions (session_date DESC);

CREATE TABLE IF NOT EXISTS player_signups (
  id BIGSERIAL PRIMARY KEY,
  group_session_id BIGINT NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  emergency_contact TEXT NOT NULL,
  foot TEXT,
  team TEXT,
  notes TEXT,
  has_paid BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT,
  stripe_charge_id TEXT,
  stripe_receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_player_signups_group_session_id
  ON player_signups (group_session_id);

CREATE INDEX IF NOT EXISTS idx_player_signups_has_paid
  ON player_signups (has_paid);
