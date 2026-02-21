-- ============================================================================
-- CRM SYSTEM MIGRATION
-- Adds complete CRM system for managing coaching business:
-- - Parent/player tracking
-- - Session scheduling (first sessions + recurring)
-- - Package management
-- - Reminders and follow-ups
-- - Activity tracking
-- ============================================================================

-- ============================================================================
-- MIGRATION 001: Create CRM Tables
-- ============================================================================

-- Parents table (primary entity)
CREATE TABLE crm_parents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  instagram_link VARCHAR(500),
  secondary_parent_name VARCHAR(255),
  dm_status VARCHAR(50) CHECK (dm_status IN ('first_message', 'started_talking', 'request_phone_call', 'went_cold')),
  phone_call_booked BOOLEAN DEFAULT FALSE,
  call_date_time TIMESTAMP,
  call_outcome VARCHAR(50) CHECK (call_outcome IN ('session_booked', 'thinking_about_it', 'uninterested', 'went_cold')),
  interest_in_package BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crm_parents_dm_status ON crm_parents(dm_status);
CREATE INDEX idx_crm_parents_call_outcome ON crm_parents(call_outcome);

-- Players table (belong to a parent)
CREATE TABLE crm_players (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES crm_parents(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  age INTEGER,
  team VARCHAR(255),
  gender VARCHAR(20) CHECK (gender IN ('male', 'female', 'other')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crm_players_parent_id ON crm_players(parent_id);

-- Packages table (must exist before sessions since sessions references it)
CREATE TABLE crm_packages (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES crm_parents(id) ON DELETE CASCADE,
  package_type VARCHAR(100) NOT NULL CHECK (package_type IN (
    '12_week_1x', '12_week_2x', '6_week_1x', '6_week_2x'
  )),
  total_sessions INTEGER NOT NULL,
  sessions_completed INTEGER DEFAULT 0,
  price DECIMAL(10, 2),
  start_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crm_packages_parent_id ON crm_packages(parent_id);
CREATE INDEX idx_crm_packages_is_active ON crm_packages(is_active);

-- First sessions table (special trial session from phone call, has deposit)
CREATE TABLE crm_first_sessions (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES crm_parents(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES crm_players(id) ON DELETE SET NULL,
  session_date TIMESTAMP NOT NULL,
  location VARCHAR(255),
  price DECIMAL(10, 2),
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_amount DECIMAL(10, 2),
  showed_up BOOLEAN,
  cancelled BOOLEAN DEFAULT FALSE,
  was_paid BOOLEAN DEFAULT FALSE,
  payment_method VARCHAR(50) CHECK (payment_method IN ('zelle', 'venmo', 'paypal', 'apple_cash', 'cash')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crm_first_sessions_parent_id ON crm_first_sessions(parent_id);
CREATE INDEX idx_crm_first_sessions_session_date ON crm_first_sessions(session_date);

-- Regular sessions table (recurring sessions after the first)
CREATE TABLE crm_sessions (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES crm_parents(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES crm_players(id) ON DELETE SET NULL,
  session_date TIMESTAMP NOT NULL,
  location VARCHAR(255),
  price DECIMAL(10, 2),
  showed_up BOOLEAN,
  cancelled BOOLEAN DEFAULT FALSE,
  was_paid BOOLEAN DEFAULT FALSE,
  payment_method VARCHAR(50) CHECK (payment_method IN ('zelle', 'venmo', 'paypal', 'apple_cash', 'cash')),
  package_id INTEGER REFERENCES crm_packages(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crm_sessions_parent_id ON crm_sessions(parent_id);
CREATE INDEX idx_crm_sessions_session_date ON crm_sessions(session_date);
CREATE INDEX idx_crm_sessions_package_id ON crm_sessions(package_id);

-- Reminders table (session reminders + follow-up reminders for all ghost scenarios)
CREATE TABLE crm_reminders (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER NOT NULL REFERENCES crm_parents(id) ON DELETE CASCADE,
  first_session_id INTEGER REFERENCES crm_first_sessions(id) ON DELETE CASCADE,
  session_id INTEGER REFERENCES crm_sessions(id) ON DELETE CASCADE,
  reminder_type VARCHAR(50) NOT NULL CHECK (reminder_type IN (
    'session_48h', 'session_24h', 'session_6h',
    'follow_up_1d', 'follow_up_3d', 'follow_up_7d', 'follow_up_14d'
  )),
  reminder_category VARCHAR(50) NOT NULL CHECK (reminder_category IN (
    'session_reminder', 'dm_follow_up', 'post_call_follow_up',
    'post_first_session_follow_up', 'post_session_follow_up'
  )),
  due_at TIMESTAMP NOT NULL,
  sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_crm_reminders_parent_id ON crm_reminders(parent_id);
CREATE INDEX idx_crm_reminders_due_at ON crm_reminders(due_at);
CREATE INDEX idx_crm_reminders_sent ON crm_reminders(sent);
CREATE INDEX idx_crm_reminders_category ON crm_reminders(reminder_category);

-- ============================================================================
-- MIGRATION 002: Add Status Columns
-- ============================================================================

-- Add status column to crm_first_sessions
ALTER TABLE crm_first_sessions 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled' 
CHECK (status IN ('scheduled', 'accepted', 'cancelled', 'rescheduled', 'no_show', 'completed'));

-- Add status column to crm_sessions
ALTER TABLE crm_sessions 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'scheduled' 
CHECK (status IN ('scheduled', 'accepted', 'cancelled', 'rescheduled', 'no_show', 'completed'));

-- Update existing records to set status based on current fields
UPDATE crm_first_sessions 
SET status = CASE 
  WHEN showed_up = true THEN 'completed'
  WHEN cancelled = true THEN 'cancelled'
  ELSE 'scheduled'
END
WHERE status IS NULL OR status = 'scheduled';

UPDATE crm_sessions 
SET status = CASE 
  WHEN showed_up = true THEN 'completed'
  WHEN cancelled = true THEN 'cancelled'
  ELSE 'scheduled'
END
WHERE status IS NULL OR status = 'scheduled';

-- ============================================================================
-- MIGRATION 003: Add Customer Field and Multi-Player Support
-- ============================================================================

-- Add is_customer field to parents table
ALTER TABLE crm_parents 
ADD COLUMN IF NOT EXISTS is_customer BOOLEAN DEFAULT FALSE;

-- Create junction table for multiple players per session
CREATE TABLE IF NOT EXISTS crm_session_players (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES crm_sessions(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES crm_players(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_session_players_session_id ON crm_session_players(session_id);
CREATE INDEX IF NOT EXISTS idx_crm_session_players_player_id ON crm_session_players(player_id);

-- Create junction table for multiple players per first session
CREATE TABLE IF NOT EXISTS crm_first_session_players (
  id SERIAL PRIMARY KEY,
  first_session_id INTEGER REFERENCES crm_first_sessions(id) ON DELETE CASCADE,
  player_id INTEGER REFERENCES crm_players(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(first_session_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_first_session_players_session_id ON crm_first_session_players(first_session_id);
CREATE INDEX IF NOT EXISTS idx_crm_first_session_players_player_id ON crm_first_session_players(player_id);

-- Mark existing parents with first sessions as customers
UPDATE crm_parents 
SET is_customer = TRUE 
WHERE id IN (SELECT DISTINCT parent_id FROM crm_first_sessions);

-- Migrate existing player_id relationships to junction tables
-- For first sessions
INSERT INTO crm_first_session_players (first_session_id, player_id)
SELECT id, player_id 
FROM crm_first_sessions 
WHERE player_id IS NOT NULL
ON CONFLICT (first_session_id, player_id) DO NOTHING;

-- For regular sessions
INSERT INTO crm_session_players (session_id, player_id)
SELECT id, player_id 
FROM crm_sessions 
WHERE player_id IS NOT NULL
ON CONFLICT (session_id, player_id) DO NOTHING;

-- ============================================================================
-- MIGRATION 004: Add Activity Tracking
-- ============================================================================

-- Add last_activity_at to track when parent was last interacted with
ALTER TABLE crm_parents
ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Backfill with created_at for existing records
UPDATE crm_parents
SET last_activity_at = COALESCE(updated_at, created_at)
WHERE last_activity_at IS NULL;

-- Add index for efficient querying of cold leads
CREATE INDEX IF NOT EXISTS idx_parents_last_activity ON crm_parents(last_activity_at);

-- ============================================================================
-- END OF COMBINED MIGRATION
-- ============================================================================
