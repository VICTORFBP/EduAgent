"""EduAgent ? Planeacion Router."""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
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


def _get_skill_context(area: str, tipo_actividad: str | None = None) -> str:
    """Read the formatting skill markdown file based on the area and activity type."""
    skills_dir = os.path.join(os.path.dirname(__file__), "..", "skills")

    standards = ""
    standards_path = os.path.join(skills_dir, "document_standards.md")
    try:
        if os.path.exists(standards_path):
            with open(standards_path, "r", encoding="utf-8") as f:
                standards = f.read()
    except Exception as e:
        logger.error(f"Error reading standards file {standards_path}: {e}")

    components = ""
    components_path = os.path.join(skills_dir, "components_reference.md")
    try:
        if os.path.exists(components_path):
            with open(components_path, "r", encoding="utf-8") as f:
                components = f.read()
    except Exception as e:
        logger.error(f"Error reading components reference file {components_path}: {e}")

    # If the docente specified a prueba estandarizada, prepend the specific skill
    # and skip the generic formatting skill (they conflict in format expectations).
    tipo_lower = (tipo_actividad or "").lower()
    if "prueba" in tipo_lower and "estandar" in tipo_lower:
        prueba_path = os.path.join(skills_dir, "prueba_estandarizada.md")
        prueba_skill = ""
        try:
            if os.path.exists(prueba_path):
                with open(prueba_path, "r", encoding="utf-8") as f:
                    prueba_skill = f.read()
        except Exception as e:
            logger.error(f"Error reading prueba_estandarizada skill: {e}")
        return f"{standards}\n\n---\n\n{prueba_skill}"

    filename = "general.md"
    area_lower = area.lower()
    if "matematica" in area_lower or "matemática" in area_lower:
        filename = "matematicas.md"
    elif "lenguaje" in area_lower or "castellano" in area_lower:
        filename = "lenguaje.md"

    filepath = os.path.join(skills_dir, filename)
    skill_content = "Genera el contenido en formato Markdown estructurado."
    try:
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                skill_content = f.read()
    except Exception as e:
        logger.error(f"Error reading skill file {filepath}: {e}")

    return f"{standards}\n\n{components}\n\n---\n\n{skill_content}"


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

        skill_context = _get_skill_context(request.area, tipo_actividad=request.tipo_actividad)

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


async def _process_generar_actividad_bg(
    planeacion_id: str,
    plan: dict,
    skill_context: str
):
    """Background task to generate and verify an activity."""
    try:
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
        if not updated_plan:
            return

        actividad_generada = updated_plan.get("actividad_generada")
        
        # Automatic Verification
        if actividad_generada:
            try:
                verified_actividad = await n8n_service.trigger_verificar_actividad(actividad_generada)
                if verified_actividad and isinstance(verified_actividad, dict):
                    if "contenido_grados" in verified_actividad or "titulo" in verified_actividad:
                        await supabase_service.update_planeacion(
                            planeacion_id, 
                            {"actividad_generada": verified_actividad}
                        )
            except Exception as e:
                logger.warning(f"Error en verificación automática, usando original: {e}")
    except Exception as e:
        logger.error(f"Error in background activity generation for planeacion {planeacion_id}: {e}")

@router.post("/{planeacion_id}/actividad")
async def generate_actividad(
    planeacion_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """Generate the activity sheet for a specific planeacion."""
    try:
        plan = await supabase_service.get_planeacion(planeacion_id)
        if not plan:
            raise HTTPException(status_code=404, detail="Planeaci?n no encontrada")

        skill_context = _get_skill_context(plan["area"], tipo_actividad=plan.get("tipo_actividad"))

        background_tasks.add_task(
            _process_generar_actividad_bg,
            planeacion_id,
            plan,
            skill_context
        )

        return {"status": "processing", "message": "Generando en segundo plano"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error starting activity generation for planeacion {planeacion_id}: {e}")
        raise HTTPException(
            status_code=502, detail=f"Error al generar actividad: {str(e)}"
        )


@router.get("/{planeacion_id}/actividad/pdf")
async def get_actividad_pdf(
    planeacion_id: str,
    grado: int,
):
    """Genera y devuelve el PDF de la actividad para un grado específico (usando Typst)."""
    from fastapi.responses import Response
    from app.services.pdf_generator import pdf_generator_service
    
    plan = await supabase_service.get_planeacion(planeacion_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Planeación no encontrada")
    
    actividad = plan.get("actividad_generada")
    if not actividad:
        raise HTTPException(status_code=404, detail="La planeación no tiene actividad generada")
        
    try:
        pdf_bytes = await pdf_generator_service.generate_pdf(actividad, plan, grado)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"inline; filename=actividad_grado_{grado}.pdf"}
        )
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"Error generando PDF: {repr(e)}\n{tb}")
        raise HTTPException(status_code=500, detail=f"Error interno al generar el PDF: {repr(e)}")


@router.get("/{planeacion_id}/actividad/prueba-pdf")
async def get_prueba_estandarizada_pdf(
    planeacion_id: str,
    grado: int,
    docente: bool = False,
):
    """Genera y devuelve el PDF de la prueba estandarizada para un grado.

    Query params:
      - grado: número de grado a renderizar.
      - docente: si es true, la hoja de respuestas mostrará las burbujas marcadas.
    """
    from fastapi.responses import Response
    from app.services.pdf_generator import pdf_generator_service

    plan = await supabase_service.get_planeacion(planeacion_id)
    if not plan:
        raise HTTPException(status_code=404, detail="Planeación no encontrada")

    actividad = plan.get("actividad_generada")
    if not actividad:
        raise HTTPException(status_code=404, detail="La planeación no tiene actividad generada")

    try:
        pdf_bytes = await pdf_generator_service.generate_prueba_pdf(
            actividad, plan, grado, docente=docente
        )
        suffix = "docente" if docente else "estudiante"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": (
                    f"inline; filename=prueba_grado_{grado}_{suffix}.pdf"
                )
            },
        )
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        logger.error(f"Error generando PDF prueba: {repr(e)}\n{tb}")
        raise HTTPException(
            status_code=500,
            detail=f"Error interno al generar el PDF de prueba: {repr(e)}",
        )


