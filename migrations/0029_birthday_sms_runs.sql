CREATE TABLE IF NOT EXISTS birthday_sms_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  local_date DATE NOT NULL UNIQUE,
  timezone TEXT NOT NULL,
  birthday_count INT NOT NULL DEFAULT 0,
  birthday_names JSONB NOT NULL DEFAULT '[]'::jsonb,
  message_body TEXT NOT NULL DEFAULT '',
  twilio_message_sid TEXT,
  twilio_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS birthday_sms_runs_local_date_idx
  ON birthday_sms_runs(local_date DESC);
