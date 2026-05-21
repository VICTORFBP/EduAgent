"""EduAgent ? Planeacion Router."""

from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth_middleware import get_current_user
from app.models.planeacion import (
    PlaneacionCreateRequest,
    PlaneacionResponse,
    PlaneacionValidateRequest,
    PlaneacionListResponse,
)
from app.services.supabase_service import supabase_service
from app.services.n8n_service import n8n_service
import logging
import os

logger = logging.getLogger(__name__)
router = APIRouter()


def _get_skill_context(area: str) -> str:
    """Read the formatting skill markdown file based on the area."""
    skills_dir = os.path.join(os.path.dirname(__file__), "..", "skills")

    filename = "general.md"
    area_lower = area.lower()
    if "matematica" in area_lower or "matem?tica" in area_lower:
        filename = "matematicas.md"
    elif "lenguaje" in area_lower or "castellano" in area_lower:
        filename = "lenguaje.md"
    elif "ciencia" in area_lower:
        filename = "ciencias.md"

    filepath = os.path.join(skills_dir, filename)
    try:
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                return f.read()
    except Exception as e:
        logger.error(f"Error reading skill file {filepath}: {e}")

    return "Genera el contenido en formato Markdown estructurado."


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
    """Generate a new planeacion using the RAG agent via n8n."""
    try:
        contenido_anterior = None
        feedback = None
        if request.parent_plan_id:
            parent_plan = await supabase_service.get_planeacion(request.parent_plan_id)
            if not parent_plan:
                raise HTTPException(status_code=404, detail="Planeaci?n padre no encontrada")
            contenido_anterior = parent_plan.get("contenido_generado")
            feedback = request.feedback

        skill_context = _get_skill_context(request.area)

        raw = await n8n_service.trigger_planeacion(
            area=request.area,
            grados=request.grados,
            tema=request.tema,
            duracion=request.duracion,
            recursos=request.recursos,
            docente_id=current_user["id"],
            feedback=feedback,
            contenido_anterior=contenido_anterior,
            tipo_actividad=request.tipo_actividad,
            skill_context=skill_context,
        )
        return _extract_data(raw)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating planeacion: {e}")
        raise HTTPException(status_code=502, detail=f"Error al generar planeaci?n: {str(e)}")


@router.get("/", response_model=list[PlaneacionListResponse])
async def list_planeaciones(current_user: dict = Depends(get_current_user)):
    """List all planeaciones for the current docente."""
    return await supabase_service.get_planeaciones(current_user["id"])


@router.get("/{planeacion_id}")
async def get_planeacion(
    planeacion_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single planeacion by ID."""
    plan = await supabase_service.get_planeacion(planeacion_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Planeaci?n no encontrada")
    return plan


@router.patch("/{planeacion_id}")
async def validate_planeacion(
    planeacion_id: str,
    request: PlaneacionValidateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Validate or correct a planeacion."""
    update_data = {
        "validada_docente": request.validada_docente,
        "correcciones": request.correcciones,
    }
    if request.contenido_generado is not None:
        update_data["contenido_generado"] = request.contenido_generado.model_dump()

    return await supabase_service.update_planeacion(planeacion_id, update_data)


@router.delete("/{planeacion_id}", status_code=200)
async def delete_planeacion(
    planeacion_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a planeacion owned by the current docente."""
    plan = await supabase_service.get_planeacion(planeacion_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Planeaci?n no encontrada")
    if plan.get("docente_id") != current_user["id"]:
        raise HTTPException(
            status_code=403, detail="No tienes permiso para eliminar esta planeaci?n"
        )
    await supabase_service.delete_planeacion(planeacion_id)
    return {"deleted": True, "id": planeacion_id}


@router.post("/{planeacion_id}/actividad")
async def generate_actividad(
    planeacion_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Generate the activity sheet for a specific planeacion."""
    try:
        plan = await supabase_service.get_planeacion(planeacion_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Planeaci?n no encontrada")

        skill_context = _get_skill_context(plan["area"])

        await n8n_service.trigger_generar_actividad(
            planeacion_id=planeacion_id,
            area=plan["area"],
            grados=plan["grados"],
            tema=plan["tema"],
            contenido_generado=plan["contenido_generado"],
            tipo_actividad=plan.get("tipo_actividad"),
            skill_context=skill_context,
        )

        updated_plan = await supabase_service.get_planeacion(planeacion_id)
        return updated_plan
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating activity for planeacion {planeacion_id}: {e}")
        raise HTTPException(
            status_code=502, detail=f"Error al generar actividad: {str(e)}"
        )
