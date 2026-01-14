-- 0009_video_enhancements.sql
-- Add features: video reports, coach overrides, ratings, watch history tracking

-- 1. Video Reports Table
CREATE TABLE IF NOT EXISTS video_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  reason TEXT NOT NULL, -- e.g., "inappropriate", "broken_link", "incorrect_category", "other"
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- "pending", "reviewed", "resolved", "dismissed"
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES parents(id) -- Admin/coach who resolved it
);

CREATE INDEX IF NOT EXISTS video_reports_video_id_idx ON video_reports(video_id);
CREATE INDEX IF NOT EXISTS video_reports_player_id_idx ON video_reports(player_id);
CREATE INDEX IF NOT EXISTS video_reports_status_idx ON video_reports(status);

-- 2. Coach Video Overrides (Manual Pinning)
CREATE TABLE IF NOT EXISTS coach_video_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  pinned_by UUID NOT NULL REFERENCES parents(id), -- Coach/parent who pinned it
  priority INT NOT NULL DEFAULT 1, -- Higher priority = shows higher in list
  note TEXT, -- Optional note for why this was pinned
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(player_id, video_id) -- Can't pin same video twice for same player
);

CREATE INDEX IF NOT EXISTS coach_video_pins_player_id_idx ON coach_video_pins(player_id);
CREATE INDEX IF NOT EXISTS coach_video_pins_video_id_idx ON coach_video_pins(video_id);

-- 3. Update video_engagement to add rating and watch progress
ALTER TABLE video_engagement
  ADD COLUMN IF NOT EXISTS rating_stars INT CHECK (rating_stars >= 1 AND rating_stars <= 5),
  ADD COLUMN IF NOT EXISTS last_position_seconds INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_watch_time_seconds INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Drop old rating column if it exists (was just a generic number)
ALTER TABLE video_engagement DROP COLUMN IF EXISTS rating;

-- Update comments
COMMENT ON COLUMN video_engagement.rating_stars IS '1-5 star rating from player';
COMMENT ON COLUMN video_engagement.last_position_seconds IS 'Last playback position for continue watching';
COMMENT ON COLUMN video_engagement.total_watch_time_seconds IS 'Total time spent watching this video';
COMMENT ON COLUMN video_engagement.started_at IS 'When player first started watching this video';
