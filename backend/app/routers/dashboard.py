"""EduAgent — Dashboard Router."""

from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import get_current_user
from app.services.supabase_service import supabase_service

router = APIRouter()


@router.get("/metricas")
async def get_metricas(current_user: dict = Depends(get_current_user)):
    """Get aggregated dashboard metrics for the current docente."""
    stats = await supabase_service.get_dashboard_stats(current_user["id"])
    return {
        **stats,
        "tiempo_ahorrado_horas": 0,
        "tasa_alineacion_men": 0,
    }


@router.get("/actividad")
async def get_actividad(current_user: dict = Depends(get_current_user)):
    """Get recent activity for the current docente."""
    # In production, aggregate from interaction_logs
    return []


@router.get("/estudiantes")
async def get_estudiantes(current_user: dict = Depends(get_current_user)):
    """Get students assigned to the current docente."""
    return await supabase_service.get_estudiantes(current_user["id"])
