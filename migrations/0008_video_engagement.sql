-- Migration: Add video_engagement table for tracking player-video interactions
-- This table stores individual engagement records for personalized recommendations

CREATE TABLE IF NOT EXISTS video_engagement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core relationships
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,

  -- Engagement metrics
  watched BOOLEAN NOT NULL DEFAULT false,
  completed BOOLEAN NOT NULL DEFAULT false,
  rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
  watch_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps for behavior analysis
  first_watched_at TIMESTAMPTZ,
  last_watched_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  rated_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure one engagement record per player-video pair
  UNIQUE(player_id, video_id)
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS video_engagement_player_id_idx ON video_engagement(player_id);
CREATE INDEX IF NOT EXISTS video_engagement_video_id_idx ON video_engagement(video_id);
CREATE INDEX IF NOT EXISTS video_engagement_completed_idx ON video_engagement(player_id, completed);
CREATE INDEX IF NOT EXISTS video_engagement_rating_idx ON video_engagement(player_id, rating) WHERE rating IS NOT NULL;

-- Auto-update trigger
DROP TRIGGER IF EXISTS video_engagement_set_updated_at ON video_engagement;
CREATE TRIGGER video_engagement_set_updated_at
BEFORE UPDATE ON video_engagement
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
