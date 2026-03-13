CREATE TABLE IF NOT EXISTS signed_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_key TEXT NOT NULL,
  document_title TEXT NOT NULL,
  document_url TEXT NOT NULL,
  parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  player_name TEXT NOT NULL,
  player_birthdate DATE,
  parent_guardian_name TEXT NOT NULL,
  phone_number TEXT,
  emergency_contact TEXT NOT NULL,
  typed_signature_name TEXT NOT NULL,
  signature_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS signed_documents_document_key_created_idx
  ON signed_documents(document_key, created_at DESC);

CREATE INDEX IF NOT EXISTS signed_documents_parent_created_idx
  ON signed_documents(parent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS signed_documents_player_created_idx
  ON signed_documents(player_id, created_at DESC);
