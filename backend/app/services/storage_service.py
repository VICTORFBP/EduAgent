"""EduAgent — Storage Service: Supabase Storage operations."""

import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

BUCKET_DOCUMENTOS = "documentos"
BUCKET_EVALUACIONES = "evaluaciones"


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

    async def upload_documento(self, file_bytes: bytes, filename: str, docente_id: str) -> str:
        """Upload a document PDF to Supabase Storage."""
        path = f"{docente_id}/{filename}"
        if self.client:
            self.client.storage.from_(BUCKET_DOCUMENTOS).upload(
                path, file_bytes, {"content-type": "application/pdf"}
            )
        return f"{BUCKET_DOCUMENTOS}/{path}"

    async def upload_evaluacion(self, file_bytes: bytes, filename: str, docente_id: str) -> str:
        """Upload an evaluation image/PDF to Supabase Storage."""
        path = f"{docente_id}/{filename}"
        if self.client:
            content_type = "image/jpeg" if filename.lower().endswith((".jpg", ".jpeg")) else "application/pdf"
            self.client.storage.from_(BUCKET_EVALUACIONES).upload(
                path, file_bytes, {"content-type": content_type}
            )
        return f"{BUCKET_EVALUACIONES}/{path}"

    async def get_public_url(self, bucket: str, path: str) -> str:
        """Get a public URL for a stored file."""
        if self.client:
            return self.client.storage.from_(bucket).get_public_url(path)
        return f"https://placeholder/{bucket}/{path}"

    async def create_signed_url(self, bucket: str, path: str, expires_in: int = 3600) -> str:
        """Create a signed URL for a private file."""
        if self.client:
            # path is relative to bucket
            res = self.client.storage.from_(bucket).create_signed_url(path, expires_in)
            return res.get("signedURL") or res.get("signedUrl")
        return ""


# Singleton instance
storage_service = StorageService()
