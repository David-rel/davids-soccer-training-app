CREATE TABLE training_requests (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id    UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  parent_name  TEXT NOT NULL,
  player_name  TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  location     TEXT,
  availability TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'seen')),
  seen_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ON training_requests(created_at DESC);

CREATE TRIGGER training_requests_set_updated_at BEFORE UPDATE ON training_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
