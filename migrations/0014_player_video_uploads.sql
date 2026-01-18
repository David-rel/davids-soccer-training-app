-- 0014_player_video_uploads.sql
-- Add player_video_uploads table for player content submissions
-- Players can upload videos (30s-3min) for coach review
-- Limited to 4 uploads per calendar month

CREATE TABLE IF NOT EXISTS player_video_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Player submission
  video_url TEXT NOT NULL,
  description TEXT,

  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('pending', 'reviewed')) DEFAULT 'pending',
  upload_month DATE NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date,

  -- Coach response (nullable until reviewed)
  coach_video_response_url TEXT,
  coach_document_response_url TEXT,
  coach_response_description TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS player_video_uploads_player_id_idx ON player_video_uploads(player_id);
CREATE INDEX IF NOT EXISTS player_video_uploads_status_idx ON player_video_uploads(status);
CREATE INDEX IF NOT EXISTS player_video_uploads_upload_month_idx ON player_video_uploads(upload_month);
CREATE INDEX IF NOT EXISTS player_video_uploads_created_at_idx ON player_video_uploads(created_at DESC);

-- Composite index for monthly limit checks
CREATE INDEX IF NOT EXISTS player_video_uploads_player_month_idx
  ON player_video_uploads(player_id, upload_month);

-- Updated_at trigger
DROP TRIGGER IF EXISTS player_video_uploads_set_updated_at ON player_video_uploads;
CREATE TRIGGER player_video_uploads_set_updated_at
BEFORE UPDATE ON player_video_uploads
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
