-- Migration: Add videos table for YouTube video database
-- This table stores training videos with coach/parent recommendations

CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core video info
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  category TEXT,  -- e.g., ball_mastery, dribbling, shooting, etc.

  -- Metadata from YouTube
  thumbnail_url TEXT,
  duration TEXT,
  channel TEXT,

  -- Publishing control
  published BOOLEAN NOT NULL DEFAULT true,
  source TEXT NOT NULL CHECK (source IN ('coach', 'parent')),  -- Who added it
  recommended_by_parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,  -- If parent-recommended

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS videos_published_idx ON videos(published);
CREATE INDEX IF NOT EXISTS videos_category_idx ON videos(category);
CREATE INDEX IF NOT EXISTS videos_source_idx ON videos(source);

DROP TRIGGER IF EXISTS videos_set_updated_at ON videos;
CREATE TRIGGER videos_set_updated_at
BEFORE UPDATE ON videos
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
