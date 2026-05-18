CREATE TABLE player_period_goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  description  TEXT,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE player_goal_steps (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_goal_id UUID NOT NULL REFERENCES player_period_goals(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  target_date    DATE,
  completed      BOOLEAN NOT NULL DEFAULT false,
  completed_at   TIMESTAMPTZ,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT goal_steps_completed_at_chk CHECK (
    (completed = false AND completed_at IS NULL) OR
    (completed = true  AND completed_at IS NOT NULL)
  )
);

CREATE INDEX ON player_period_goals(player_id, start_date);
CREATE INDEX ON player_goal_steps(period_goal_id, sort_order);

CREATE TRIGGER period_goals_set_updated_at BEFORE UPDATE ON player_period_goals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER goal_steps_set_updated_at BEFORE UPDATE ON player_goal_steps
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
