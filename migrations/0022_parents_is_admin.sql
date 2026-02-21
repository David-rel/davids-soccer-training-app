ALTER TABLE parents
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS parents_is_admin_idx
ON parents (is_admin);
