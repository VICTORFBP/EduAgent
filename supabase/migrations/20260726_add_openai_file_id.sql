-- Add openai_file_id to documentos table for DOCENTE_CUSTOM docs
-- This stores the OpenAI Files API ID so the file can be passed directly
-- as input_file in the Responses API, without vectorization.

ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS openai_file_id text;

COMMENT ON COLUMN documentos.openai_file_id IS
  'OpenAI Files API ID for DOCENTE_CUSTOM docs used as direct context (not vectorized via RAG)';
