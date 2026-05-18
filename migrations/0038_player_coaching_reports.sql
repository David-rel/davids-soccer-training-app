CREATE TABLE player_coaching_reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('baseline', 'progress', 'blurb')),
  title       TEXT NOT NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  content     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON player_coaching_reports(player_id, report_date DESC);

CREATE TRIGGER coaching_reports_set_updated_at BEFORE UPDATE ON player_coaching_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
