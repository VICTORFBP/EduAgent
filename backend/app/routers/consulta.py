"""EduAgent — Consulta RAG Router."""

import logging
import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.middleware.auth_middleware import get_current_user
from app.services.supabase_service import supabase_service
from app.services.openai_service import openai_service
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)
router = APIRouter()


class ConsultaRequest(BaseModel):
    pregunta: str = Field(..., min_length=3, description="Pregunta del docente")
    session_id: str | None = Field(None, description="ID de la sesión de chat")
    area: str | None = Field(None, description="Filtro por área")
    grado: int | None = Field(None, ge=1, le=5, description="Filtro por grado")


@router.post("/")
async def consulta_rag(
    request: ConsultaRequest,
    current_user: dict = Depends(get_current_user),
):
    """Send a question to the RAG chat agent directly via openai_service."""
    t_start = time.time()
    exitoso = False
    try:
        # 1. Search for relevant context
        filter_metadata = {}
        if request.area:
            filter_metadata["area"] = request.area
        if request.grado:
            filter_metadata["grado"] = request.grado

        # Only search official MEN documents and this user's custom docs
        # Since pgvector doesn't support complex JOINs in RPC easily, we rely on the query 
        # embedding similarity. For a production app, we would add RLS or pass doc IDs.
        
        rag_results = await rag_service.search_documents(
            query=request.pregunta,
            top_k=5,
            filter_metadata=filter_metadata if filter_metadata else None,
        )
        rag_context = "\n\n".join([r["content"] for r in rag_results]) if rag_results else ""

        # 2. Get answer from OpenAI
        respuesta_texto = await openai_service.chat_rag(
            pregunta=request.pregunta,
            rag_context=rag_context
        )

        exitoso = True
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
    finally:
        duracion_ms = int((time.time() - t_start) * 1000)
        try:
            await supabase_service.log_interaction({
                "docente_id": current_user["id"],
                "modulo": "consulta_rag",
                "accion": "consulta",
                "duracion_ms": duracion_ms,
                "tokens_usados": 0,
                "exitoso": exitoso,
                "metadata": {
                    "area": request.area,
                    "grado": request.grado,
                    "tiene_session": request.session_id is not None,
                },
            })
        except Exception as log_err:
            logger.warning(f"log_interaction failed (non-critical): {log_err}")
