-- group_sessions: add end date
ALTER TABLE group_sessions
ADD COLUMN IF NOT EXISTS session_date_end TIMESTAMPTZ;

-- player_signups: contact phone (optional), contact email (required)
ALTER TABLE player_signups
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

ALTER TABLE player_signups
ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Backfill: make contact_email NOT NULL after adding; set existing rows to empty string then add constraint
UPDATE player_signups
SET contact_email = ''
WHERE contact_email IS NULL;

ALTER TABLE player_signups
ALTER COLUMN contact_email SET NOT NULL;
