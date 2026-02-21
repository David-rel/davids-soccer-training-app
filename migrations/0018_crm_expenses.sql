CREATE TABLE IF NOT EXISTS crm_expenses (
  id BIGSERIAL PRIMARY KEY,
  expense_date DATE NOT NULL,
  vendor TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  payment_method TEXT,
  receipt_url TEXT,
  receipt_blob_path TEXT,
  business_percentage NUMERIC(5, 2) NOT NULL DEFAULT 100 CHECK (business_percentage >= 0 AND business_percentage <= 100),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crm_expenses_expense_date
  ON crm_expenses (expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_crm_expenses_category
  ON crm_expenses (category);
