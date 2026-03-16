ALTER TABLE signed_documents
ADD COLUMN IF NOT EXISTS signed_document_url TEXT;

ALTER TABLE signed_documents
ADD COLUMN IF NOT EXISTS signed_blob_key TEXT;
