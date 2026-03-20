ALTER TABLE player_signups
  ADD COLUMN IF NOT EXISTS signup_price NUMERIC(10, 2);

ALTER TABLE player_signups
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10, 2);

ALTER TABLE player_signups
  DROP CONSTRAINT IF EXISTS player_signups_signup_price_nonnegative;

ALTER TABLE player_signups
  ADD CONSTRAINT player_signups_signup_price_nonnegative
  CHECK (signup_price IS NULL OR signup_price >= 0);

ALTER TABLE player_signups
  DROP CONSTRAINT IF EXISTS player_signups_amount_paid_nonnegative;

ALTER TABLE player_signups
  ADD CONSTRAINT player_signups_amount_paid_nonnegative
  CHECK (amount_paid IS NULL OR amount_paid >= 0);

UPDATE player_signups
SET amount_paid = signup_price
WHERE has_paid = true
  AND amount_paid IS NULL
  AND signup_price IS NOT NULL;
