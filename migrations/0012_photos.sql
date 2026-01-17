-- 0012_photos.sql
-- Photos gallery schema with SEO and metadata support

-- Photos table
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT NOT NULL,
  
  -- SEO and metadata
  meta_title TEXT,
  meta_description TEXT,
  alt_text TEXT NOT NULL,  -- Required for accessibility
  keywords TEXT[],  -- Array of keywords/tags for SEO
  
  -- Photo metadata
  photo_date TIMESTAMPTZ,  -- When the photo was taken
  photographer TEXT,  -- Photo credit
  location TEXT,  -- Where the photo was taken
  category TEXT,  -- e.g., training, game, team, individual, etc.
  
  -- Image properties
  width INT,  -- Image width in pixels
  height INT,  -- Image height in pixels
  file_size INT,  -- File size in bytes
  
  -- Display and organization
  featured BOOLEAN NOT NULL DEFAULT false,
  published BOOLEAN NOT NULL DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,  -- For custom sorting
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for photos
CREATE INDEX IF NOT EXISTS photos_published_featured_display_order_idx
  ON photos(published, featured DESC, display_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS photos_slug_idx
  ON photos(slug);
CREATE INDEX IF NOT EXISTS photos_category_idx
  ON photos(category);
CREATE INDEX IF NOT EXISTS photos_photo_date_idx
  ON photos(photo_date DESC);
CREATE INDEX IF NOT EXISTS photos_keywords_idx
  ON photos USING GIN(keywords);  -- GIN index for array searches

-- Updated_at trigger for photos
DROP TRIGGER IF EXISTS photos_set_updated_at ON photos;
CREATE TRIGGER photos_set_updated_at
BEFORE UPDATE ON photos
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
