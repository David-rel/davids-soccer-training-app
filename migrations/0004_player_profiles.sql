-- 0004_player_profiles.sql
-- Snapshot of computed metrics for a player, derived from all tests to date.

CREATE TABLE IF NOT EXISTS player_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_profiles_player_id_idx ON player_profiles(player_id);
CREATE INDEX IF NOT EXISTS player_profiles_computed_at_idx ON player_profiles(computed_at);

DROP TRIGGER IF EXISTS player_profiles_set_updated_at ON player_profiles;
CREATE TRIGGER player_profiles_set_updated_at
BEFORE UPDATE ON player_profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

