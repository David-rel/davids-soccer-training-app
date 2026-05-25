ALTER TABLE parents
  ADD COLUMN IF NOT EXISTS signup_token UUID,
  ADD COLUMN IF NOT EXISTS signup_token_expires_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS parents_signup_token_idx
  ON parents (signup_token)
  WHERE signup_token IS NOT NULL;
