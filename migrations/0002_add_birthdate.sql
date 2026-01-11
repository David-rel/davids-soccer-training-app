-- 0002_add_birthdate.sql
-- Add birthdate (source of truth). Age is derived at runtime.

ALTER TABLE players
ADD COLUMN IF NOT EXISTS birthdate DATE;

-- If birth_year is missing but birthdate exists, backfill it.
UPDATE players
SET birth_year = EXTRACT(YEAR FROM birthdate)::int
WHERE birth_year IS NULL AND birthdate IS NOT NULL;

