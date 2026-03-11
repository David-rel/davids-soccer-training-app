ALTER TABLE players
ADD COLUMN IF NOT EXISTS notes_last_auto_refresh_at TIMESTAMPTZ;
