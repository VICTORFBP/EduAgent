"""EduAgent — Consulta RAG Router."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from app.middleware.auth_middleware import get_current_user
from app.services.n8n_service import n8n_service
import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)
router = APIRouter()


class ConsultaRequest(BaseModel):
    pregunta: str = Field(..., min_length=3, description="Pregunta del docente")
    session_id: str | None = Field(None, description="ID de la sesión de chat")
    area: str | None = Field(None, description="Filtro por área")
    grado: int | None = Field(None, ge=1, le=5, description="Filtro por grado")


def _extract_text(raw) -> str | None:
    """
    Extract the assistant's text from whatever n8n returns.

    n8n webhook (lastNode mode) can return:
      - A list of item objects: [{"output": "..."}, ...]
      - A single dict:          {"output": "..."}
      - Nested in data key:     {"data": [{"output": "..."}]}
    """
    if raw is None:
        return None

    # Unwrap {"data": [...]} envelope
    if isinstance(raw, dict) and "data" in raw:
        raw = raw["data"]

    # Handle list — n8n returns items as array
    if isinstance(raw, list) and len(raw) > 0:
        raw = raw[0]  # Take the first item

    # Now raw should be a dict
    if isinstance(raw, dict):
        return (
            raw.get("output")
            or raw.get("respuesta")
            or raw.get("answer")
            or raw.get("text")
            or raw.get("content")
        )

    # Last resort — stringify whatever we got
    if raw:
        return str(raw)

    return None


@router.post("/")
async def consulta_rag(
    request: ConsultaRequest,
    current_user: dict = Depends(get_current_user),
):
    """Send a question to the RAG chat agent via n8n and return a structured response."""
    try:
        raw = await n8n_service.trigger_consulta(
            pregunta=request.pregunta,
            docente_id=current_user["id"],
            session_id=request.session_id,
            area=request.area,
            grado=request.grado,
        )

        logger.info(f"n8n raw response type={type(raw).__name__}: {str(raw)[:200]}")

        respuesta_texto = _extract_text(raw)

        if not respuesta_texto:
            logger.warning(f"Could not extract text from n8n response: {raw}")
            respuesta_texto = (
                "EduAgent recibió tu pregunta pero no pudo generar una respuesta. "
                "Por favor intenta de nuevo en unos momentos."
            )

        return {
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": respuesta_texto,
            "sources": [],
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        logger.error(f"Error in RAG consultation: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail=f"Error en consulta RAG: {str(e)}")
