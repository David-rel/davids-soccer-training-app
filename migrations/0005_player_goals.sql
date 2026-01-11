-- 0005_player_goals.sql
-- Per-player goals / action items, managed by admin and parents.

CREATE TABLE IF NOT EXISTS player_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  due_date DATE,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT player_goals_completed_at_chk CHECK (
    (completed = false AND completed_at IS NULL)
    OR
    (completed = true AND completed_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS player_goals_player_id_idx ON player_goals(player_id);
CREATE INDEX IF NOT EXISTS player_goals_player_id_completed_idx ON player_goals(player_id, completed);
CREATE INDEX IF NOT EXISTS player_goals_player_id_due_date_idx ON player_goals(player_id, due_date);

DROP TRIGGER IF EXISTS player_goals_set_updated_at ON player_goals;
CREATE TRIGGER player_goals_set_updated_at
BEFORE UPDATE ON player_goals
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

