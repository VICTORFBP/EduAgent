"""EduAgent — Text Extraction Service.

Extracts text from PDFs and images locally.
"""

import logging
import base64
import fitz
from openai import AsyncOpenAI
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

class TextExtractionService:
    def __init__(self):
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        return self._client

    def _extract_from_pdf(self, file_bytes: bytes) -> str:
        """Extract text from a PDF file using PyMuPDF."""
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            text_blocks = []
            for page in doc:
                text_blocks.append(page.get_text("text"))
            return "\n".join(text_blocks).strip()
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            return ""

    async def _extract_from_image(self, file_bytes: bytes, content_type: str) -> str:
        """Extract text and description from an image using OpenAI Vision."""
        try:
            base64_image = base64.b64encode(file_bytes).decode("utf-8")
            response = await self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "Por favor, extrae todo el texto visible en esta imagen. Si hay diagramas, tablas o información pedagógica, descríbelos de forma concisa para que sirvan como contexto para la creación de una planeación de clase."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:{content_type};base64,{base64_image}"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=2000,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"Error extracting text from image: {e}")
            return ""

    async def extract_text(self, file_bytes: bytes, content_type: str) -> str | None:
        """Extract text from supported file types."""
        if content_type == "application/pdf":
            text = self._extract_from_pdf(file_bytes)
            return text if text else None
            
        if content_type.startswith("image/"):
            text = await self._extract_from_image(file_bytes, content_type)
            return text if text else None
            
        logger.warning(f"Unsupported content type for text extraction: {content_type}")
        return None

# Singleton instance
text_extraction_service = TextExtractionService()
