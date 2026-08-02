"""EduAgent — RAG Service: Document ingestion and vector search.

Replaces n8n workflows for document ingestion and RAG-based search.
Uses OpenAI Embeddings + Supabase pgvector.
"""

import logging
import json
from typing import Optional

import fitz  # PyMuPDF
from openai import AsyncOpenAI

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ─── Chunking parameters (matching n8n's Recursive Character Text Splitter) ──
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200


class RAGService:
    """Handles document ingestion (chunking + embedding) and vector search."""

    def __init__(self):
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        return self._client

    # ─── Text Splitting ───────────────────────────────────────────────────────

    @staticmethod
    def _recursive_split(text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> list[str]:
        """Split text into overlapping chunks using recursive character splitting."""
        separators = ["\n\n", "\n", ". ", " ", ""]
        chunks: list[str] = []

        def _split_recursive(txt: str, seps: list[str]) -> list[str]:
            if len(txt) <= chunk_size:
                return [txt] if txt.strip() else []

            sep = seps[0] if seps else ""
            remaining_seps = seps[1:] if len(seps) > 1 else [""]

            if sep:
                parts = txt.split(sep)
            else:
                # Last resort: split by character count
                result = []
                for i in range(0, len(txt), chunk_size - overlap):
                    result.append(txt[i:i + chunk_size])
                return result

            current_chunk = ""
            result = []

            for part in parts:
                candidate = current_chunk + sep + part if current_chunk else part
                if len(candidate) <= chunk_size:
                    current_chunk = candidate
                else:
                    if current_chunk:
                        if len(current_chunk) <= chunk_size:
                            result.append(current_chunk)
                        else:
                            result.extend(_split_recursive(current_chunk, remaining_seps))

                    if len(part) > chunk_size:
                        result.extend(_split_recursive(part, remaining_seps))
                        current_chunk = ""
                    else:
                        current_chunk = part

            if current_chunk.strip():
                if len(current_chunk) <= chunk_size:
                    result.append(current_chunk)
                else:
                    result.extend(_split_recursive(current_chunk, remaining_seps))

            return result

        raw_chunks = _split_recursive(text, separators)

        # Add overlap between consecutive chunks
        if overlap > 0 and len(raw_chunks) > 1:
            overlapped = [raw_chunks[0]]
            for i in range(1, len(raw_chunks)):
                prev = raw_chunks[i - 1]
                overlap_text = prev[-overlap:] if len(prev) > overlap else prev
                overlapped.append(overlap_text + raw_chunks[i])
            chunks = overlapped
        else:
            chunks = raw_chunks

        return [c for c in chunks if c.strip()]

    # ─── Embeddings ───────────────────────────────────────────────────────────

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for a list of texts using OpenAI."""
        if not texts:
            return []

        # OpenAI allows batch embedding (up to ~8k tokens per text)
        BATCH_SIZE = 20
        all_embeddings: list[list[float]] = []

        for i in range(0, len(texts), BATCH_SIZE):
            batch = texts[i:i + BATCH_SIZE]
            try:
                response = await self.client.embeddings.create(
                    model=settings.openai_embedding_model,
                    input=batch,
                )
                for item in response.data:
                    all_embeddings.append(item.embedding)
            except Exception as e:
                logger.error(f"Error generating embeddings (batch {i}): {e}")
                # Fill with empty embeddings for failed batch
                all_embeddings.extend([[] for _ in batch])

        return all_embeddings

    async def generate_embedding(self, text: str) -> list[float]:
        """Generate a single embedding."""
        results = await self.generate_embeddings([text])
        return results[0] if results else []

    # ─── Document Ingestion ───────────────────────────────────────────────────

    async def ingest_document(
        self,
        doc_id: str,
        file_bytes: bytes,
        area: str | None = None,
        grado: int | None = None,
    ) -> int:
        """
        Ingest a PDF document: extract text, chunk, embed, store in pgvector.
        Returns the number of chunks created.

        Replaces n8n's "EduAgent - Document Ingestion (RAG)" workflow.
        """
        from app.services.supabase_service import supabase_service

        # 1. Extract text from PDF
        text = self._extract_text_from_pdf(file_bytes)
        if not text or not text.strip():
            logger.warning(f"No text extracted from document {doc_id}")
            return 0

        # 2. Split into chunks
        chunks = self._recursive_split(text)
        if not chunks:
            logger.warning(f"No chunks created from document {doc_id}")
            return 0

        logger.info(f"Document {doc_id}: extracted {len(chunks)} chunks")

        # 3. Generate embeddings
        embeddings = await self.generate_embeddings(chunks)

        # 4. Insert chunks into document_chunks table
        inserted = 0
        for chunk_text, embedding in zip(chunks, embeddings):
            if not embedding:
                continue
            try:
                metadata = {"documento_id": doc_id}
                if area:
                    metadata["area"] = area
                if grado:
                    metadata["grado"] = grado

                supabase_service.client.table("document_chunks").insert({
                    "content": chunk_text,
                    "embedding": embedding,
                    "metadata": metadata,
                    "documento_id": doc_id,
                }).execute()
                inserted += 1
            except Exception as e:
                logger.error(f"Error inserting chunk for {doc_id}: {e}")

        # 5. Mark document as vectorized
        await supabase_service.update_documento_vectorizado(doc_id, vectorizado=True)

        logger.info(f"Document {doc_id}: inserted {inserted}/{len(chunks)} chunks ✅")
        return inserted

    @staticmethod
    def _extract_text_from_pdf(file_bytes: bytes) -> str:
        """Extract text from PDF using PyMuPDF."""
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            text_blocks = []
            for page in doc:
                text_blocks.append(page.get_text("text"))
            doc.close()
            return "\n".join(text_blocks).strip()
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            return ""

    # ─── Vector Search ────────────────────────────────────────────────────────

    async def search_documents(
        self,
        query: str,
        top_k: int = 5,
        filter_metadata: dict | None = None,
    ) -> list[dict]:
        """
        Search for relevant document chunks using vector similarity.
        Returns list of {content, metadata, similarity}.

        Replaces n8n's Supabase Vector Store tool.
        """
        from app.services.supabase_service import supabase_service

        if not supabase_service.client:
            return []

        # Generate query embedding
        query_embedding = await self.generate_embedding(query)
        if not query_embedding:
            logger.error("Failed to generate query embedding")
            return []

        try:
            # Call the match_documents RPC function
            response = supabase_service.client.rpc(
                "match_documents",
                {
                    "query_embedding": query_embedding,
                    "match_count": top_k,
                    "filter": filter_metadata or {},
                },
            ).execute()

            results = []
            for row in (response.data or []):
                results.append({
                    "content": row.get("content", ""),
                    "metadata": row.get("metadata", {}),
                    "similarity": row.get("similarity", 0),
                })
            return results
        except Exception as e:
            logger.error(f"Error in vector search: {e}")
            return []


# Singleton
rag_service = RAGService()
