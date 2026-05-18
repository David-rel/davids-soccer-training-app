CREATE TABLE player_call_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id        UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  parent_id        UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (30, 60)),
  availability     TEXT NOT NULL,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'seen')),
  seen_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE challenges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  video_url   TEXT NOT NULL,
  is_youtube  BOOLEAN NOT NULL DEFAULT false,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE challenge_submissions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  video_url    TEXT NOT NULL,
  is_youtube   BOOLEAN NOT NULL DEFAULT false,
  notes        TEXT,
  public       BOOLEAN NOT NULL DEFAULT false,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'seen')),
  seen_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, player_id)
);

CREATE INDEX ON player_call_requests(player_id, created_at DESC);
CREATE INDEX ON challenge_submissions(challenge_id);
CREATE INDEX ON challenge_submissions(player_id);

CREATE TRIGGER call_requests_set_updated_at BEFORE UPDATE ON player_call_requests
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER challenges_set_updated_at BEFORE UPDATE ON challenges
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER challenge_submissions_set_updated_at BEFORE UPDATE ON challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
