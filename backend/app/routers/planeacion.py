"""EduAgent — Planeacion Router."""

import logging
import os
import time

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from app.middleware.auth_middleware import get_current_user
from app.models.planeacion import (
    PlaneacionCreateRequest,
    PlaneacionResponse,
    PlaneacionValidateRequest,
    PlaneacionListResponse,
)
from app.services.supabase_service import supabase_service
from app.services.openai_service import openai_service
from app.services.rag_service import rag_service

logger = logging.getLogger(__name__)
router = APIRouter()


def _is_prueba_estandarizada(tipo_actividad: str | None) -> bool:
    """Check if the requested activity is a standardized multiple-choice test (ICFES/Saber)."""
    if not tipo_actividad:
        return False
    tipo_lower = str(tipo_actividad).lower()
    keywords = [
        "icfes",
        "saber",
        "estandar",
        "estándar",
        "seleccion multiple",
        "selección múltiple",
        "opcion multiple",
        "opción múltiple",
        "simulacro",
    ]
    return any(kw in tipo_lower for kw in keywords)


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

    # If the docente specified a prueba estandarizada (ICFES/Saber), load the specific skill
    # and skip the generic formatting skill (they conflict in format expectations).
    if _is_prueba_estandarizada(tipo_actividad):
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
    # Inglés, Tecnología, Educación Física, Ciencias, Ética, Artística → general.md
    # general.md contains specific guidelines for each of these areas.

    filepath = os.path.join(skills_dir, filename)
    skill_content = "Genera el contenido en formato Markdown estructurado."
    try:
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                skill_content = f.read()
    except Exception as e:
        logger.error(f"Error reading skill file {filepath}: {e}")

    return f"{standards}\n\n{components}\n\n---\n\n{skill_content}"


@router.post("/", response_model=dict)
async def create_planeacion(
    request: PlaneacionCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Generate a new planeacion using OpenAI with RAG context."""
    t_start = time.time()
    exitoso = False
    try:
        contenido_anterior = None
        feedback = None
        if request.parent_plan_id:
            parent_plan = await supabase_service.get_planeacion(request.parent_plan_id)
            if not parent_plan:
                raise HTTPException(status_code=404, detail="Planeación padre no encontrada")
            contenido_anterior = parent_plan.get("contenido_generado")
            feedback = request.feedback

        skill_context = _get_skill_context(request.area, tipo_actividad=request.tipo_actividad)

        # Resolve documento_ids → contenido_texto for direct reference
        reference_text_list: list[str] = []
        if request.documento_ids:
            reference_text_list = await supabase_service.get_documentos_text_content(
                current_user["id"], request.documento_ids
            )
        reference_context = "\n\n".join(reference_text_list) if reference_text_list else None

        # RAG: search for relevant DBA/Standards in vector store
        rag_query = f"{request.area} grado {', '.join(str(g) for g in request.grados)} {request.tema}"
        rag_results = await rag_service.search_documents(rag_query, top_k=5)
        rag_context = "\n\n".join([r["content"] for r in rag_results]) if rag_results else None

        # Web Research: investigación conceptual sobre el tema
        research_context = await openai_service.research_topic(
            area=request.area,
            grados=request.grados,
            tema=request.tema,
        )

        # 1. Generación de planeación
        result = await openai_service.generate_planeacion(
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
            reference_context=reference_context,
            rag_context=rag_context,
            research_context=research_context,
        )

        # 2. Revisión y auditoría pedagógica antes de presentar/guardar
        result = await openai_service.review_planeacion(
            planeacion_result=result,
            area=request.area,
            grados=request.grados,
            tema=request.tema,
        )

        # Add documento_ids to the result for persistence
        if request.documento_ids:
            result["documento_ids"] = request.documento_ids
        # Save to database
        saved_plan = await supabase_service.create_planeacion(result)
        
        exitoso = True
        return saved_plan
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating planeacion: {e}")
        raise HTTPException(status_code=502, detail=f"Error al generar planeación: {str(e)}")
    finally:
        duracion_ms = int((time.time() - t_start) * 1000)
        tokens = 0
        try:
            await supabase_service.log_interaction({
                "docente_id": current_user["id"],
                "modulo": "planeacion",
                "accion": "generar",
                "duracion_ms": duracion_ms,
                "tokens_usados": tokens,
                "exitoso": exitoso,
                "metadata": {
                    "area": request.area,
                    "tema": request.tema,
                    "grados": request.grados,
                    "es_refinamiento": request.parent_plan_id is not None,
                    "reference_docs_count": len(reference_text_list),
                },
            })
        except Exception as log_err:
            logger.warning(f"log_interaction failed (non-critical): {log_err}")


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
        raise HTTPException(status_code=404, detail="Planeación no encontrada")
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
        raise HTTPException(status_code=404, detail="Planeación no encontrada")
    if plan.get("docente_id") != current_user["id"]:
        raise HTTPException(
            status_code=403, detail="No tienes permiso para eliminar esta planeación"
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
        # Recuperar el reference_context de los documentos almacenados
        reference_text_list: list[str] = []
        documento_ids = plan.get("documento_ids") or []
        if documento_ids:
            reference_text_list = await supabase_service.get_documentos_text_content(
                plan["docente_id"], documento_ids
            )
        reference_context = "\n\n".join(reference_text_list) if reference_text_list else None

        # Investigación conceptual previa (Omitida para optimizar tiempo, la planeación ya tiene contexto)
        research_context = None


        actividad = await openai_service.generate_actividad(
            area=plan["area"],
            grados=plan["grados"],
            tema=plan["tema"],
            contenido_generado=plan["contenido_generado"],
            tipo_actividad=plan.get("tipo_actividad"),
            skill_context=skill_context,
            reference_context=reference_context,
            research_context=research_context,
        )

        # Save activity to planeacion
        await supabase_service.update_planeacion(
            planeacion_id,
            {"actividad_generada": actividad}
        )

        # Automatic Rigorous Verification, Linting, and Typst Dry-Run
        if actividad:
            try:
                verified_actividad = await openai_service.verify_actividad(
                    actividad,
                    tipo_actividad=plan.get("tipo_actividad"),
                    area=plan["area"],
                    tema=plan["tema"],
                    grados=plan.get("grados"),
                    plan=plan,
                    skip_llm_review=True,
                )
                if verified_actividad and isinstance(verified_actividad, dict):
                    if "contenido_grados" in verified_actividad or "titulo" in verified_actividad:
                        await supabase_service.update_planeacion(
                            planeacion_id,
                            {"actividad_generada": verified_actividad}
                        )
                        logger.info(f"Actividad para planeacion {planeacion_id} verificada y persistida exitosamente.")
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
            raise HTTPException(status_code=404, detail="Planeación no encontrada")

        # Auto-aprobar la planeación si aún no ha sido validada, ya que al generar
        # la actividad se asume que el docente está de acuerdo con la planeación.
        if not plan.get("validada_docente"):
            await supabase_service.update_planeacion(
                planeacion_id,
                {"validada_docente": True}
            )
            # Actualizamos el estado local para el background task
            plan["validada_docente"] = True

        skill_context = _get_skill_context(plan["area"], tipo_actividad=plan.get("tipo_actividad"))

        background_tasks.add_task(
            _process_generar_actividad_bg,
            planeacion_id,
            plan,
            skill_context
        )

        return {"status": "processing", "message": "Generando en segundo plano", "auto_approved": True}
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
    docente: bool = False,
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
        if _is_prueba_estandarizada(plan.get("tipo_actividad")) or _is_prueba_estandarizada(actividad.get("titulo")):
            pdf_bytes = await pdf_generator_service.generate_prueba_pdf(actividad, plan, grado, docente=docente)
        else:
            pdf_bytes = await pdf_generator_service.generate_pdf(actividad, plan, grado, docente=docente)
        suffix = "docente" if docente else "estudiante"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"inline; filename=actividad_grado_{grado}_{suffix}.pdf",
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
            }
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
                ),
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"
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
