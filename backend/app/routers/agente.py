"""EduAgent — Agent Router: SSE streaming endpoint for the AI agent."""

import logging
import time
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.middleware.auth_middleware import get_current_user
from app.services.agent_service import agent_service
from app.services.supabase_service import supabase_service

logger = logging.getLogger(__name__)
router = APIRouter()


class AgentChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Mensaje del docente al agente")
    session_id: str | None = Field(None, description="ID de la sesión de chat para memoria")
    history: list[dict] | None = Field(
        None,
        description="Historial de mensajes previos [{role: user|assistant, content: str}]",
    )


@router.post("/chat")
async def agent_chat(
    request: AgentChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Stream an agent conversation turn using Server-Sent Events (SSE).

    Returns a stream of events:
      - tool_call   → agent decided to call a tool
      - tool_result → tool execution result
      - content     → streaming text chunk
      - done        → final complete response
      - error       → unrecoverable error
    """
    t_start = time.time()
    docente_id = current_user["id"]

    async def event_generator():
        exitoso = False
        try:
            async for event in agent_service.stream_chat(
                message=request.message,
                docente_id=docente_id,
                session_id=request.session_id,
                history=request.history,
            ):
                yield event
            exitoso = True
        except Exception as e:
            import json
            logger.error(f"Agent stream error: {e}", exc_info=True)
            yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
        finally:
            duracion_ms = int((time.time() - t_start) * 1000)
            try:
                await supabase_service.log_interaction({
                    "docente_id": docente_id,
                    "modulo": "agente",
                    "accion": "chat",
                    "duracion_ms": duracion_ms,
                    "tokens_usados": 0,
                    "exitoso": exitoso,
                    "metadata": {
                        "tiene_session": request.session_id is not None,
                        "history_len": len(request.history or []),
                    },
                })
            except Exception as log_err:
                logger.warning(f"log_interaction failed (non-critical): {log_err}")

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )

