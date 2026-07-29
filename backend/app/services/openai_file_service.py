"""EduAgent — OpenAI File Service: Upload/delete files via OpenAI Files API.

Used for DOCENTE_CUSTOM documents so they can be referenced directly as
`input_file` in the OpenAI Responses API during planeación generation,
without going through vectorization / RAG.
"""

import logging

from openai import AsyncOpenAI
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# MIME types supported by OpenAI for direct file input
_SUPPORTED_OPENAI_MIMES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
}


class OpenAIFileService:
    """Manages upload and deletion of files in OpenAI's Files API."""

    def __init__(self):
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        return self._client

    async def upload_file(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> str | None:
        """Upload a file to OpenAI Files API and return its file_id.

        Uses purpose='user_data' which is compatible with the Responses API
        as an `input_file` or `input_image` content block.

        Returns the file_id (e.g. 'file-abc123...') or None on failure.
        """
        if content_type not in _SUPPORTED_OPENAI_MIMES:
            logger.warning(
                f"Content type '{content_type}' not in supported OpenAI mimes — skipping upload"
            )
            return None

        try:
            file_tuple = (filename, file_bytes, content_type)
            response = await self.client.files.create(
                file=file_tuple,
                purpose="user_data",
            )
            file_id = response.id
            logger.info(f"Uploaded file to OpenAI Files API: {file_id} ({filename})")
            return file_id
        except Exception as e:
            logger.error(f"Error uploading file '{filename}' to OpenAI Files API: {e}")
            return None

    async def delete_file(self, file_id: str) -> bool:
        """Delete a file from OpenAI Files API.

        Returns True if deleted successfully or file didn't exist, False on error.
        """
        if not file_id:
            return True
        try:
            await self.client.files.delete(file_id)
            logger.info(f"Deleted file from OpenAI Files API: {file_id}")
            return True
        except Exception as e:
            logger.warning(f"Error deleting file '{file_id}' from OpenAI Files API: {e}")
            return False


# Singleton instance
openai_file_service = OpenAIFileService()
