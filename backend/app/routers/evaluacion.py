"""EduAgent — Evaluación Router."""

import logging
import time
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks

from app.middleware.auth_middleware import get_current_user
from app.services.supabase_service import supabase_service
from app.services.n8n_service import n8n_service
from app.services.storage_service import storage_service, ALLOWED_EVALUATION_MIMES

logger = logging.getLogger(__name__)
router = APIRouter()


async def _trigger_evaluacion_background(
    evaluacion_id: str,
    estudiante_id: str,
    docente_id: str,
    area: str,
    tipo: str,
    bucket: str,
    rel_path: str,
    contexto_evaluacion: dict | None = None,
    estudiantes_lote: list[dict] | None = None,
) -> None:
    """Fire-and-forget: trigger n8n Gemini Vision evaluation; errors logged only."""
    try:
        signed_url = await storage_service.create_signed_url(bucket, rel_path, expires_in=3600)
        await n8n_service.trigger_evaluacion(
            evaluacion_id=evaluacion_id,
            estudiante_id=estudiante_id,
            docente_id=docente_id,
            area=area,
            tipo=tipo,
            archivo_url=signed_url,
            contexto_evaluacion=contexto_evaluacion,
            estudiantes_lote=estudiantes_lote,
        )
        logger.info(f"Evaluación {evaluacion_id} enviada a Gemini Vision via n8n ✅")
    except Exception as e:
        logger.error(f"n8n evaluación trigger failed for {evaluacion_id}: {e}")


@router.post("/")
async def create_evaluacion(
    background_tasks: BackgroundTasks,
    estudiante_id: str = Form(...),
    estudiante_nombre: str = Form(...),
    area: str = Form(...),
    tipo: str = Form(...),
    archivo: UploadFile = File(...),
    planeacion_id: str | None = Form(None),
    grado: int | None = Form(None),
    solo_manual: bool = Form(False),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload and process a student evaluation.
    Returns immediately with the created record ID.
    Gemini Vision processing happens asynchronously via n8n.
    The result is updated via POST /callback/evaluacion-completada.
    """
    content_type = archivo.content_type or ""
    if content_type not in ALLOWED_EVALUATION_MIMES:
        raise HTTPException(
            status_code=415,
            detail=f"Tipo de archivo no permitido: {content_type}. "
                   f"Usa PDF, JPG, PNG o WEBP.",
        )

    # Prevent duplicate evaluation for same student/plan
    if planeacion_id and planeacion_id != "none":
        existing_eval = await supabase_service.get_evaluacion_by_student_plan(estudiante_id, planeacion_id)
        if existing_eval:
            raise HTTPException(
                status_code=400,
                detail="Este estudiante ya tiene una evaluación enviada para esta planeación. Elimínala primero si deseas volver a evaluar.",
            )

    t_start = time.time()
    exitoso = False
    try:
        file_bytes = await archivo.read()
        
        # Strip "Clave del Docente" if it's a PDF
        if content_type == "application/pdf":
            try:
                import fitz
                pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
                pages_to_keep = []
                for i in range(len(pdf_doc)):
                    text = pdf_doc[i].get_text()
                    if "Clave del Docente" not in text and "Clave de respuestas" not in text:
                        pages_to_keep.append(i)
                
                # If we found a teacher key page, remove it
                if len(pages_to_keep) < len(pdf_doc):
                    new_pdf = fitz.open()
                    for i in pages_to_keep:
                        new_pdf.insert_pdf(pdf_doc, from_page=i, to_page=i)
                    file_bytes = new_pdf.write()
                    new_pdf.close()
                pdf_doc.close()
            except Exception as e:
                logger.warning(f"Failed to strip teacher key from PDF: {e}")

        filename = f"{uuid.uuid4()}_{archivo.filename}"
        storage_path = await storage_service.upload_evaluacion(
            file_bytes, filename, current_user["id"], content_type
        )

        # Persist initial record (not yet processed)
        eval_data = {
            "estudiante_id": estudiante_id,
            "estudiante_nombre": estudiante_nombre,
            "docente_id": current_user["id"],
            "area": area,
            "tipo": tipo,
            "archivo_path": storage_path,
            "procesado_correctamente": False,
            "nota": None,
            "retroalimentacion": None,
            "error_ocr": None,
            "planeacion_id": planeacion_id,
            "grado": grado,
        }
        db_record = await supabase_service.create_evaluacion(eval_data)

        # Extract context if linked to a planeacion
        contexto_evaluacion = None
        if planeacion_id:
            plan = await supabase_service.get_planeacion(planeacion_id)
            if plan:
                contexto_evaluacion = {
                    "tema": plan.get("tema"),
                    "criterios_evaluacion": plan.get("contenido_generado", {}).get("criterios_evaluacion"),
                    "actividad_generada": plan.get("actividad_generada"),
                }

        # Fire-and-forget n8n call (Gemini Vision) unless solo_manual is True
        if not solo_manual:
            bucket, rel_path = storage_path.split("/", 1)
            background_tasks.add_task(
                _trigger_evaluacion_background,
                db_record["id"],
                estudiante_id,
                current_user["id"],
                area,
                tipo,
                bucket,
                rel_path,
                contexto_evaluacion,
            )
            message = "Evaluación creada. Gemini Vision está analizando el archivo..."
        else:
            message = "Evaluación creada. Lista para calificación manual."

        exitoso = True
        return {
            "id": db_record["id"],
            "status": "processing" if not solo_manual else "manual",
            "message": message,
            "data": db_record,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing evaluación: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al procesar evaluación: {str(e)}"
        )
    finally:
        duracion_ms = int((time.time() - t_start) * 1000)
        try:
            await supabase_service.log_interaction({
                "docente_id": current_user["id"],
                "modulo": "evaluacion",
                "accion": "subir",
                "duracion_ms": duracion_ms,
                "tokens_usados": 0,
                "exitoso": exitoso,
                "metadata": {
                    "area": area,
                    "tipo": tipo,
                    "estudiante_id": estudiante_id,
                    "tiene_planeacion": planeacion_id is not None,
                },
            })
        except Exception as log_err:
            logger.warning(f"log_interaction failed (non-critical): {log_err}")

async def _process_single_lote_file(
    file_bytes, filename, content_type, area, tipo, planeacion_id, grado, current_user,
    background_tasks, contexto_evaluacion, estudiantes_lote, procesados
):
    storage_path = await storage_service.upload_evaluacion(
        file_bytes, filename, current_user["id"], content_type
    )

    eval_data = {
        "estudiante_id": None,
        "estudiante_nombre": "Sin Identificar",
        "docente_id": current_user["id"],
        "area": area,
        "tipo": tipo,
        "archivo_path": storage_path,
        "procesado_correctamente": False,
        "nota": None,
        "retroalimentacion": None,
        "error_ocr": None,
        "planeacion_id": planeacion_id if planeacion_id != "none" else None,
        "grado": grado,
    }
    db_record = await supabase_service.create_evaluacion(eval_data)
    
    bucket, rel_path = storage_path.split("/", 1)
    background_tasks.add_task(
        _trigger_evaluacion_background,
        db_record["id"],
        None,
        current_user["id"],
        area,
        tipo,
        bucket,
        rel_path,
        contexto_evaluacion,
        estudiantes_lote,
    )
    procesados.append(db_record["id"])

@router.post("/lote")
async def create_evaluacion_lote(
    background_tasks: BackgroundTasks,
    area: str = Form(...),
    archivos: list[UploadFile] = File(...),
    planeacion_id: str | None = Form(None),
    grado: int | None = Form(None),
    current_user: dict = Depends(get_current_user),
):
    tipo = "estandarizada"
    
    estudiantes = await supabase_service.get_estudiantes(current_user["id"])
    estudiantes_lote = [{"id": e["id"], "nombre": e["nombre"]} for e in estudiantes]
    
    contexto_evaluacion = None
    if planeacion_id and planeacion_id != "none":
        plan = await supabase_service.get_planeacion(planeacion_id)
        if plan:
            contexto_evaluacion = {
                "tema": plan.get("tema"),
                "criterios_evaluacion": plan.get("contenido_generado", {}).get("criterios_evaluacion"),
                "actividad_generada": plan.get("actividad_generada"),
            }

    procesados = []
    
    try:
        for archivo in archivos:
            content_type = archivo.content_type or ""
            file_bytes = await archivo.read()
            
            if content_type == "application/pdf":
                try:
                    import fitz
                    pdf_doc = fitz.open(stream=file_bytes, filetype="pdf")
                    for i in range(len(pdf_doc)):
                        new_pdf = fitz.open()
                        new_pdf.insert_pdf(pdf_doc, from_page=i, to_page=i)
                        page_bytes = new_pdf.write()
                        new_pdf.close()
                        
                        await _process_single_lote_file(
                            page_bytes, f"{uuid.uuid4()}_pagina_{i+1}.pdf", "application/pdf",
                            area, tipo, planeacion_id, grado, current_user,
                            background_tasks, contexto_evaluacion, estudiantes_lote, procesados
                        )
                    pdf_doc.close()
                except Exception as e:
                    logger.warning(f"Failed to process PDF in lote: {e}")
            else:
                if content_type in ALLOWED_EVALUATION_MIMES:
                    await _process_single_lote_file(
                        file_bytes, f"{uuid.uuid4()}_{archivo.filename}", content_type,
                        area, tipo, planeacion_id, grado, current_user,
                        background_tasks, contexto_evaluacion, estudiantes_lote, procesados
                    )
        
        return {
            "status": "processing",
            "message": f"Se están procesando {len(procesados)} evaluaciones en lote.",
            "procesados": procesados
        }
    except Exception as e:
        logger.error(f"Error processing evaluación por lote: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al procesar lote: {str(e)}"
        )

@router.get("/")
async def list_evaluaciones(current_user: dict = Depends(get_current_user)):
    """List all evaluaciones for the current docente."""
    return await supabase_service.get_evaluaciones(current_user["id"])


@router.get("/{evaluacion_id}")
async def get_evaluacion(
    evaluacion_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single evaluación by ID."""
    eval_data = await supabase_service.get_evaluacion(evaluacion_id)
    if not eval_data:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    if eval_data["docente_id"] != current_user["id"]:
        raise HTTPException(
            status_code=403, detail="No tienes acceso a esta evaluación"
        )
    return eval_data


@router.delete("/{evaluacion_id}")
async def delete_evaluacion(
    evaluacion_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete an evaluation."""
    eval_data = await supabase_service.get_evaluacion(evaluacion_id)
    if not eval_data:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    if eval_data["docente_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta evaluación")
        
    await supabase_service.delete_evaluacion(evaluacion_id)
    return {"message": "Evaluación eliminada correctamente"}


@router.post("/{evaluacion_id}/retry")
async def retry_evaluacion(
    evaluacion_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """Retry an evaluation processing in n8n."""
    eval_data = await supabase_service.get_evaluacion(evaluacion_id)
    if not eval_data:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    if eval_data["docente_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta evaluación")
        
    # Reset processing flag
    await supabase_service.update_evaluacion(evaluacion_id, {
        "procesado_correctamente": False,
        "error_ocr": None
    })
    
    # Extract context if linked to a planeacion
    contexto_evaluacion = None
    if eval_data.get("planeacion_id"):
        plan = await supabase_service.get_planeacion(eval_data["planeacion_id"])
        if plan:
            contexto_evaluacion = {
                "tema": plan.get("tema"),
                "criterios_evaluacion": plan.get("contenido_generado", {}).get("criterios_evaluacion"),
                "actividad_generada": plan.get("actividad_generada"),
            }

    estudiantes_lote = None
    if eval_data.get("estudiante_id") is None:
        estudiantes = await supabase_service.get_estudiantes(current_user["id"])
        estudiantes_lote = [{"id": e["id"], "nombre": e["nombre"]} for e in estudiantes]

    # Fire-and-forget n8n call
    bucket, rel_path = eval_data["archivo_path"].split("/", 1)
    background_tasks.add_task(
        _trigger_evaluacion_background,
        eval_data["id"],
        eval_data["estudiante_id"],
        current_user["id"],
        eval_data["area"],
        eval_data["tipo"],
        bucket,
        rel_path,
        contexto_evaluacion,
        estudiantes_lote,
    )
    
    return {"message": "Reintentando evaluación..."}

from pydantic import BaseModel
class EvaluacionUpdateRequest(BaseModel):
    estudiante_id: str
    estudiante_nombre: str

@router.patch("/{evaluacion_id}")
async def update_evaluacion_partial(
    evaluacion_id: str,
    update_data: EvaluacionUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Manually update evaluation fields (e.g., assign student if unidentified)."""
    eval_data = await supabase_service.get_evaluacion(evaluacion_id)
    if not eval_data:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    if eval_data["docente_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta evaluación")
        
    updated = await supabase_service.update_evaluacion(evaluacion_id, {
        "estudiante_id": update_data.estudiante_id,
        "estudiante_nombre": update_data.estudiante_nombre
    })
    
    if not updated:
        raise HTTPException(status_code=500, detail="No se pudo actualizar la evaluación")
        
    return updated

class EvaluacionCalificarRequest(BaseModel):
    nota: float
    retroalimentacion: str | None = None

@router.patch("/{evaluacion_id}/calificar")
async def calificar_manual(
    evaluacion_id: str,
    data: EvaluacionCalificarRequest,
    current_user: dict = Depends(get_current_user),
):
    """Calificar manualmente una evaluación, haciendo override de IA si existía."""
    eval_data = await supabase_service.get_evaluacion(evaluacion_id)
    if not eval_data:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    if eval_data["docente_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta evaluación")
    
    update_dict = {
        "nota": data.nota,
        "retroalimentacion": data.retroalimentacion,
        "calificacion_manual": True,
        "procesado_correctamente": True,
        "error_ocr": None
    }
    
    # Preserve IA grade if not already preserved
    if eval_data.get("nota") is not None and not eval_data.get("calificacion_manual"):
        update_dict["nota_ia"] = eval_data.get("nota")
        
    updated = await supabase_service.update_evaluacion(evaluacion_id, update_dict)
    
    if not updated:
        raise HTTPException(status_code=500, detail="No se pudo guardar la calificación")
        
    return updated

@router.post("/{evaluacion_id}/skip-ia")
async def skip_ia(
    evaluacion_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Marcar una evaluación como 'solo manual' para que no dependa de IA."""
    eval_data = await supabase_service.get_evaluacion(evaluacion_id)
    if not eval_data:
        raise HTTPException(status_code=404, detail="Evaluación no encontrada")
    if eval_data["docente_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="No tienes acceso a esta evaluación")
        
    updated = await supabase_service.update_evaluacion(evaluacion_id, {
        "procesado_correctamente": False, # Sigue pendiente de calificar
        "error_ocr": None
    })
    
    return updated
