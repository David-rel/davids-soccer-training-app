CREATE TABLE IF NOT EXISTS parent_password_reset_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS parent_password_reset_codes_parent_created_idx
  ON parent_password_reset_codes(parent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS parent_password_reset_codes_email_created_idx
  ON parent_password_reset_codes(lower(email), created_at DESC);
