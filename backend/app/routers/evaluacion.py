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

    try:
        file_bytes = await archivo.read()
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
        }
        db_record = await supabase_service.create_evaluacion(eval_data)

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
