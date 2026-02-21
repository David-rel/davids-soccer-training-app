ALTER TABLE crm_parents
ADD COLUMN IF NOT EXISTS is_dead BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_crm_parents_is_dead
ON crm_parents (is_dead);
