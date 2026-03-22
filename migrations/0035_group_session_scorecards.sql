CREATE TABLE IF NOT EXISTS group_session_scorecards (
  id BIGSERIAL PRIMARY KEY,
  group_session_id BIGINT NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  signup_id BIGINT NOT NULL UNIQUE REFERENCES player_signups(id) ON DELETE CASCADE,
  juggling TEXT,
  test_1 TEXT,
  test_2 TEXT,
  test_3 TEXT,
  test_4 TEXT,
  one_on_one_1 TEXT,
  one_on_one_2 TEXT,
  one_on_one_3 TEXT,
  skill_move_1 TEXT,
  skill_move_2 TEXT,
  skill_move_3 TEXT,
  tech TEXT,
  tactic TEXT,
  grit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS group_session_scorecards_group_session_idx
  ON group_session_scorecards (group_session_id);

CREATE INDEX IF NOT EXISTS group_session_scorecards_signup_idx
  ON group_session_scorecards (signup_id);

CREATE TABLE IF NOT EXISTS player_group_scores (
  id BIGSERIAL PRIMARY KEY,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  group_session_id BIGINT NOT NULL REFERENCES group_sessions(id) ON DELETE CASCADE,
  signup_id BIGINT UNIQUE REFERENCES player_signups(id) ON DELETE SET NULL,
  group_session_scorecard_id BIGINT REFERENCES group_session_scorecards(id) ON DELETE SET NULL,
  juggling TEXT,
  test_1 TEXT,
  test_2 TEXT,
  test_3 TEXT,
  test_4 TEXT,
  one_on_one_1 TEXT,
  one_on_one_2 TEXT,
  one_on_one_3 TEXT,
  skill_move_1 TEXT,
  skill_move_2 TEXT,
  skill_move_3 TEXT,
  tech TEXT,
  tactic TEXT,
  grit TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS player_group_scores_player_idx
  ON player_group_scores (player_id);

CREATE INDEX IF NOT EXISTS player_group_scores_session_idx
  ON player_group_scores (group_session_id);
