"""EduAgent — Evaluación Router."""

import logging
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

        # Fire-and-forget n8n call (Gemini Vision)
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

        return {
            "id": db_record["id"],
            "status": "processing",
            "message": "Evaluación creada. Gemini Vision está analizando el archivo...",
            "data": db_record,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing evaluación: {e}")
        raise HTTPException(
            status_code=500, detail=f"Error al procesar evaluación: {str(e)}"
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
    )
    
    return {"message": "Reintentando evaluación..."}
