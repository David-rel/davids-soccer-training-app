-- 0013_player_goals_set_by.sql
-- Add set_by field to track whether goal was set by parent/self or coach

-- Add set_by column with CHECK constraint
ALTER TABLE player_goals
ADD COLUMN IF NOT EXISTS set_by TEXT NOT NULL DEFAULT 'parent'
  CHECK (set_by IN ('parent', 'coach'));

-- Update existing goals to be 'parent' (since they were likely set before coaches existed or by parents)
-- If you want to change this logic, you can update this query
UPDATE player_goals
SET set_by = 'parent'
WHERE set_by IS NULL OR set_by NOT IN ('parent', 'coach');

-- Create index for filtering by set_by
CREATE INDEX IF NOT EXISTS player_goals_player_id_set_by_idx 
  ON player_goals(player_id, set_by);
