"""EduAgent — Dashboard Router."""

import time
from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import get_current_user
from app.services.supabase_service import supabase_service

router = APIRouter()

# Cache for dashboard data: docente_id -> (data, timestamp)
_dashboard_cache = {}
CACHE_TTL = 60

@router.get("/init")
async def get_dashboard_init(current_user: dict = Depends(get_current_user)):
    """Get all dashboard data concurrently with cache."""
    docente_id = current_user["id"]
    now = time.time()
    
    if docente_id in _dashboard_cache:
        cached_data, timestamp = _dashboard_cache[docente_id]
        if now - timestamp < CACHE_TTL:
            return cached_data
            
    data = await supabase_service.get_dashboard_init(docente_id)
    _dashboard_cache[docente_id] = (data, now)
    return data

@router.get("/metricas")
async def get_metricas(current_user: dict = Depends(get_current_user)):
    """Get aggregated dashboard metrics for the current docente."""
    data = await get_dashboard_init(current_user)
    return {
        **data["metricas"],
        "tiempo_ahorrado_horas": data["pilot"]["tiempo_ahorrado_horas"],
        "tasa_alineacion_men": data["pilot"]["tasa_alineacion_men"],
    }


@router.get("/actividad")
async def get_actividad(current_user: dict = Depends(get_current_user)):
    """Get recent activity for the current docente."""
    data = await get_dashboard_init(current_user)
    return data["actividad"]


@router.get("/estudiantes")
async def get_estudiantes(current_user: dict = Depends(get_current_user)):
    """Get students assigned to the current docente."""
    return await supabase_service.get_estudiantes(current_user["id"])


@router.get("/metricas-piloto")
async def get_metricas_piloto(current_user: dict = Depends(get_current_user)):
    """Get detailed pilot metrics for the current docente."""
    return await supabase_service.get_pilot_metrics(current_user["id"])
