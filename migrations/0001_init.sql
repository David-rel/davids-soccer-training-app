-- 0001_init.sql
-- Parent + Player schema

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS parents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  phone TEXT,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT parents_email_or_phone_chk CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Case-insensitive uniqueness for email
CREATE UNIQUE INDEX IF NOT EXISTS parents_email_unique
  ON parents (lower(email))
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS parents_phone_unique
  ON parents (phone)
  WHERE phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,

  -- Player profile
  name TEXT NOT NULL,
  age INT,
  birth_year INT,
  team_level TEXT,
  primary_position TEXT,
  secondary_position TEXT,
  dominant_foot TEXT,
  profile_photo_url TEXT,
  strengths TEXT,
  focus_areas TEXT,
  long_term_development_notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS players_parent_id_idx ON players(parent_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS parents_set_updated_at ON parents;
CREATE TRIGGER parents_set_updated_at
BEFORE UPDATE ON parents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS players_set_updated_at ON players;
CREATE TRIGGER players_set_updated_at
BEFORE UPDATE ON players
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

