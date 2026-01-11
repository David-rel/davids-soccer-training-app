-- 0003_player_tests.sql
-- Store per-player testing evaluations.

CREATE TABLE IF NOT EXISTS player_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  test_name TEXT NOT NULL,
  test_date DATE NOT NULL,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_tests_player_id_idx ON player_tests(player_id);
CREATE INDEX IF NOT EXISTS player_tests_test_date_idx ON player_tests(test_date);

DROP TRIGGER IF EXISTS player_tests_set_updated_at ON player_tests;
CREATE TRIGGER player_tests_set_updated_at
BEFORE UPDATE ON player_tests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

