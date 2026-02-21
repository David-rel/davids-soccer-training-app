-- Track how much of each package has actually been paid so far
-- and maintain payment history for week/day finance tracking

-- 1) Track how much of each package has actually been paid so far
ALTER TABLE crm_packages
ADD COLUMN IF NOT EXISTS amount_received numeric(10,2);

-- Backfill existing packages so current behavior stays consistent
UPDATE crm_packages
SET amount_received = COALESCE(price, 0)
WHERE amount_received IS NULL;

ALTER TABLE crm_packages
ALTER COLUMN amount_received SET DEFAULT 0;

ALTER TABLE crm_packages
DROP CONSTRAINT IF EXISTS crm_packages_amount_received_nonnegative;

ALTER TABLE crm_packages
ADD CONSTRAINT crm_packages_amount_received_nonnegative
CHECK (amount_received >= 0);

-- 2) Keep payment history events (needed for week/day finance tracking over time)
CREATE TABLE IF NOT EXISTS crm_package_payment_events (
  id SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES crm_packages(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL, -- positive = received, negative = adjustment/refund
  notes text,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_package_payment_events_package_id
  ON crm_package_payment_events(package_id);

CREATE INDEX IF NOT EXISTS idx_crm_package_payment_events_created_at
  ON crm_package_payment_events(created_at);

-- 3) Seed one baseline event per existing package (so historical totals still match)
INSERT INTO crm_package_payment_events (package_id, amount, notes, created_at)
SELECT p.id, p.amount_received, 'initial_backfill', p.created_at
FROM crm_packages p
WHERE COALESCE(p.amount_received, 0) <> 0
  AND NOT EXISTS (
    SELECT 1
    FROM crm_package_payment_events e
    WHERE e.package_id = p.id
  );
