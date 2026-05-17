"""EduAgent — Planeación Router."""

from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth_middleware import get_current_user
from app.models.planeacion import (
    PlaneacionCreateRequest,
    PlaneacionResponse,
    PlaneacionValidateRequest,
)
from app.services.supabase_service import supabase_service
from app.services.n8n_service import n8n_service
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


def _extract_data(raw) -> dict:
    """Extract a single item from n8n response."""
    if isinstance(raw, list) and len(raw) > 0:
        return raw[0]
    return raw


@router.post("/", response_model=dict)
async def create_planeacion(
    request: PlaneacionCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Generate a new planeación using the RAG agent via n8n."""
    try:
        raw = await n8n_service.trigger_planeacion(
            area=request.area,
            grados=request.grados,
            tema=request.tema,
            duracion=request.duracion,
            recursos=request.recursos,
            docente_id=current_user["id"],
        )
        return _extract_data(raw)
    except Exception as e:
        logger.error(f"Error generating planeación: {e}")
        raise HTTPException(status_code=502, detail=f"Error al generar planeación: {str(e)}")


@router.get("/")
async def list_planeaciones(current_user: dict = Depends(get_current_user)):
    """List all planeaciones for the current docente."""
    return await supabase_service.get_planeaciones(current_user["id"])


@router.get("/{planeacion_id}")
async def get_planeacion(
    planeacion_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single planeación by ID."""
    plan = await supabase_service.get_planeacion(planeacion_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Planeación no encontrada")
    return plan


@router.patch("/{planeacion_id}")
async def validate_planeacion(
    planeacion_id: str,
    request: PlaneacionValidateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Validate or correct a planeación."""
    return await supabase_service.update_planeacion(
        planeacion_id,
        {
            "validada_docente": request.validada_docente,
            "correcciones": request.correcciones,
        },
    )
