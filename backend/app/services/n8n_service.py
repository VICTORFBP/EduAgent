"""EduAgent — n8n Service: Dispatcher to n8n webhooks."""

import httpx
import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


class N8nService:
    """Dispatches requests to n8n webhooks for AI orchestration."""

    def __init__(self):
        self.headers = {
            "Content-Type": "application/json",
            "X-N8N-SECRET": settings.n8n_webhook_secret,
        }
        self.timeout = httpx.Timeout(120.0)  # Long timeout for LLM operations

    async def _call_webhook(self, url: str, payload: dict) -> dict:
        """Send a POST request to an n8n webhook endpoint."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload, headers=self.headers)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"n8n webhook error ({url}): {e.response.status_code}")
            raise
        except httpx.ConnectError:
            logger.error(f"Cannot connect to n8n ({url}). Is n8n running?")
            raise
        except Exception as e:
            logger.error(f"n8n webhook unexpected error: {e}")
            raise

    async def trigger_planeacion(
        self,
        area: str,
        grados: list[int],
        tema: str,
        duracion: int,
        recursos: str,
        docente_id: str,
    ) -> dict:
        """Trigger the planeación generation workflow in n8n."""
        payload = {
            "area": area,
            "grados": grados,
            "tema": tema,
            "duracion": duracion,
            "recursos": recursos,
            "docente_id": docente_id,
        }
        return await self._call_webhook(settings.n8n_webhook_planeacion, payload)

    async def trigger_evaluacion(
        self,
        evaluacion_id: str,
        estudiante_id: str,
        docente_id: str,
        area: str,
        tipo: str,
        archivo_url: str,
    ) -> dict:
        """Trigger the evaluación processing workflow in n8n."""
        payload = {
            "evaluacion_id": evaluacion_id,
            "estudiante_id": estudiante_id,
            "docente_id": docente_id,
            "area": area,
            "tipo": tipo,
            "archivo_url": archivo_url,
        }
        return await self._call_webhook(settings.n8n_webhook_evaluacion, payload)

    async def trigger_consulta(
        self,
        pregunta: str,
        docente_id: str,
        session_id: str | None = None,
        area: str | None = None,
        grado: int | None = None,
    ) -> dict:
        """Trigger the RAG consultation workflow in n8n."""
        payload = {
            "pregunta": pregunta,
            "docente_id": docente_id,
            "session_id": session_id,
            "area": area,
            "grado": grado,
        }
        return await self._call_webhook(settings.n8n_webhook_consulta, payload)

    async def trigger_ingesta(
        self,
        documento_id: str,
        storage_path: str,
        area: str | None = None,
        grado: int | None = None,
        file_url: str | None = None,
    ) -> dict:
        """Trigger the PDF ingestion/vectorization workflow in n8n."""
        payload = {
            "documento_id": documento_id,
            "storage_path": storage_path,
            "area": area,
            "grado": grado,
            "file_url": file_url,
        }
        return await self._call_webhook(settings.n8n_webhook_ingesta, payload)


# Singleton instance
n8n_service = N8nService()
