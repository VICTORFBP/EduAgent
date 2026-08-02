-- Migration: Ensure match_documents function exists for vector similarity search
-- This function was originally created by Supabase/n8n setup.
-- We document it here to ensure it's tracked in migrations.
-- NOTE: Function already exists in production — this migration is idempotent.

-- The existing function signature is:
-- match_documents(query_embedding vector, match_count integer, filter jsonb)
-- RETURNS TABLE(id uuid, content text, metadata jsonb, similarity double precision)
-- It supports metadata-based filtering via @> operator.

-- No changes needed — function already present.
