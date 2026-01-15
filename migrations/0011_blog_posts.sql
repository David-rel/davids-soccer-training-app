-- 0011_blog_posts.sql
-- Blog posts, comments, and likes schema

-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT,
  content JSONB NOT NULL,  -- Tiptap JSON
  content_html TEXT NOT NULL,
  featured_image_url TEXT,
  author_name TEXT NOT NULL DEFAULT 'David Fales',
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  view_count INT NOT NULL DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT
);

-- Indexes for blog_posts
CREATE INDEX IF NOT EXISTS blog_posts_published_published_at_idx
  ON blog_posts(published, published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx
  ON blog_posts(slug);

-- Updated_at trigger for blog_posts
DROP TRIGGER IF EXISTS blog_posts_set_updated_at ON blog_posts;
CREATE TRIGGER blog_posts_set_updated_at
BEFORE UPDATE ON blog_posts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Comments table
CREATE TABLE IF NOT EXISTS blog_comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for blog_comments
CREATE INDEX IF NOT EXISTS blog_comments_post_id_created_at_idx
  ON blog_comments(post_id, created_at);
CREATE INDEX IF NOT EXISTS blog_comments_approved_idx
  ON blog_comments(approved);

-- Likes table
CREATE TABLE IF NOT EXISTS blog_likes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  ip_address TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, ip_address)
);

-- Indexes for blog_likes
CREATE INDEX IF NOT EXISTS blog_likes_post_id_idx
  ON blog_likes(post_id);
