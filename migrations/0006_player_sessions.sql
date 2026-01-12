-- Migration: Add player_sessions table for tracking training sessions
-- This table stores training session records with coach notes

CREATE TABLE IF NOT EXISTS player_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  session_date DATE NOT NULL,
  title TEXT NOT NULL,

  -- Parent-visible fields (when published)
  session_plan TEXT,                  -- What was planned for the session
  focus_areas TEXT,                   -- Primary focus of the session
  activities TEXT,                    -- What was actually worked on
  things_to_try TEXT,                 -- New techniques/skills to practice
  notes TEXT,                         -- General notes about the session

  -- Admin-only field (NEVER visible to parents)
  admin_notes TEXT,                   -- Coach private internal observations

  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT player_sessions_published_at_chk CHECK (
    (published = false AND published_at IS NULL)
    OR
    (published = true AND published_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS player_sessions_player_id_idx ON player_sessions(player_id);
CREATE INDEX IF NOT EXISTS player_sessions_player_id_published_idx ON player_sessions(player_id, published);
CREATE INDEX IF NOT EXISTS player_sessions_player_id_date_idx ON player_sessions(player_id, session_date DESC);

DROP TRIGGER IF EXISTS player_sessions_set_updated_at ON player_sessions;
CREATE TRIGGER player_sessions_set_updated_at
BEFORE UPDATE ON player_sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
