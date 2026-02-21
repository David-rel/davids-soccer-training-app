ALTER TABLE parents
ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE parents
ADD COLUMN IF NOT EXISTS secondary_parent_name TEXT;

ALTER TABLE player_sessions
ADD COLUMN IF NOT EXISTS document_upload_url TEXT;

CREATE TABLE IF NOT EXISTS player_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  raw_content TEXT NOT NULL,
  cleaned_markdown_content TEXT,
  public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS player_feedback_player_id_idx
ON player_feedback (player_id);

CREATE INDEX IF NOT EXISTS player_feedback_public_idx
ON player_feedback (public);

DROP TRIGGER IF EXISTS player_feedback_set_updated_at ON player_feedback;
CREATE TRIGGER player_feedback_set_updated_at
BEFORE UPDATE ON player_feedback
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
