-- Package payment tracking and payment events (for scheduling payments by day)

ALTER TABLE crm_packages
ADD COLUMN IF NOT EXISTS amount_received numeric(10,2);

UPDATE crm_packages
SET amount_received = COALESCE(price, 0)
WHERE amount_received IS NULL;

ALTER TABLE crm_packages
ALTER COLUMN amount_received SET DEFAULT 0;

CREATE TABLE IF NOT EXISTS crm_package_payment_events (
  id SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES crm_packages(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  notes text,
  created_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_package_payment_events_package_id
  ON crm_package_payment_events(package_id);

CREATE INDEX IF NOT EXISTS idx_crm_package_payment_events_created_at
  ON crm_package_payment_events(created_at);
