"""EduAgent — Storage Service: Supabase Storage operations."""

import logging
import mimetypes
import re
import unicodedata
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

BUCKET_DOCUMENTOS = "documentos"
BUCKET_EVALUACIONES = "evaluaciones"

# Accepted MIME types for docente documents (PDFs + images)
ALLOWED_DOCUMENT_MIMES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
}

ALLOWED_EVALUATION_MIMES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
}


def _detect_content_type(filename: str, provided: str | None = None) -> str:
    """Detect content type from filename extension or use provided value."""
    if provided and provided in ALLOWED_DOCUMENT_MIMES:
        return provided
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


def sanitize_filename(filename: str) -> str:
    """Sanitize filename to be safe for Supabase Storage (ASCII only, no special characters, spaces replaced by underscores)."""
    # Decompose unicode characters to separate base characters and diacritics
    normalized = unicodedata.normalize("NFKD", filename)
    # Encode to ASCII, ignoring diacritics and non-ASCII characters, then decode back to string
    ascii_str = normalized.encode("ascii", "ignore").decode("ascii")
    # Replace non-alphanumeric/dot/underscore/hyphen characters with underscore
    sanitized = re.sub(r"[^a-zA-Z0-9._-]", "_", ascii_str)
    # Collapse multiple consecutive underscores
    sanitized = re.sub(r"_+", "_", sanitized)
    return sanitized


class StorageService:
    """Handles file upload/download to Supabase Storage."""

    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            try:
                from supabase import create_client
                self._client = create_client(
                    settings.supabase_url,
                    settings.supabase_service_key,
                )
            except Exception as e:
                logger.warning(f"Storage client not available: {e}")
                return None
        return self._client

    async def upload_documento(
        self,
        file_bytes: bytes,
        filename: str,
        docente_id: str,
        content_type: str | None = None,
    ) -> str:
        """Upload a document (PDF or image) to Supabase Storage."""
        sanitized_filename = sanitize_filename(filename)
        ct = _detect_content_type(sanitized_filename, content_type)
        path = f"{docente_id}/{sanitized_filename}"
        if self.client:
            self.client.storage.from_(BUCKET_DOCUMENTOS).upload(
                path, file_bytes, {"content-type": ct}
            )
        return f"{BUCKET_DOCUMENTOS}/{path}"

    async def upload_evaluacion(
        self,
        file_bytes: bytes,
        filename: str,
        docente_id: str,
        content_type: str | None = None,
    ) -> str:
        """Upload an evaluation image/PDF to Supabase Storage."""
        sanitized_filename = sanitize_filename(filename)
        ct = _detect_content_type(sanitized_filename, content_type)
        path = f"{docente_id}/{sanitized_filename}"
        if self.client:
            self.client.storage.from_(BUCKET_EVALUACIONES).upload(
                path, file_bytes, {"content-type": ct}
            )
        return f"{BUCKET_EVALUACIONES}/{path}"

    async def delete_file(self, bucket: str, path: str) -> bool:
        """Delete a file from Supabase Storage."""
        if self.client:
            try:
                # path in storage is relative to the bucket
                storage_path = path.replace(f"{bucket}/", "", 1)
                self.client.storage.from_(bucket).remove([storage_path])
                return True
            except Exception as e:
                logger.error(f"Error deleting {bucket}/{path}: {e}")
        return False

    async def get_public_url(self, bucket: str, path: str) -> str:
        """Get a public URL for a stored file."""
        if self.client:
            return self.client.storage.from_(bucket).get_public_url(path)
        return f"https://placeholder/{bucket}/{path}"

    async def create_signed_url(
        self, bucket: str, path: str, expires_in: int = 3600
    ) -> str:
        """Create a signed URL for a private file (valid for expires_in seconds)."""
        if self.client:
            # path is relative to bucket (strip bucket prefix if present)
            storage_path = path.replace(f"{bucket}/", "", 1)
            res = self.client.storage.from_(bucket).create_signed_url(
                storage_path, expires_in
            )
            return res.get("signedURL") or res.get("signedUrl") or ""
        return ""


# Singleton instance
storage_service = StorageService()
