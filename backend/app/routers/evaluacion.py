"""EduAgent — Evaluación Router."""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.middleware.auth_middleware import get_current_user
from app.services.supabase_service import supabase_service
from app.services.n8n_service import n8n_service
from app.services.storage_service import storage_service
import logging
import uuid

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/")
async def create_evaluacion(
    estudiante_id: str = Form(...),
    area: str = Form(...),
    tipo: str = Form(...),
    archivo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload and process a student evaluation."""
    try:
        # Upload file to Supabase Storage
        file_bytes = await archivo.read()
        filename = f"{uuid.uuid4()}_{archivo.filename}"
        storage_path = await storage_service.upload_evaluacion(
            file_bytes, filename, current_user["id"]
        )

        # Create initial record in Supabase
        eval_data = {
            "estudiante_id": estudiante_id,
            "docente_id": current_user["id"],
            "area": area,
            "tipo": tipo,
            "archivo_path": storage_path,
            "procesado_correctamente": False,
        }
        db_record = await supabase_service.create_evaluacion(eval_data)

        # Create signed URL for n8n to access the file
        bucket, path = storage_path.split("/", 1)
        signed_url = await storage_service.create_signed_url(bucket, path)

        # Trigger n8n evaluation workflow
        result = await n8n_service.trigger_evaluacion(
            evaluacion_id=db_record["id"],
            estudiante_id=estudiante_id,
            docente_id=current_user["id"],
            area=area,
            tipo=tipo,
            archivo_url=signed_url,
        )

        return result
    except Exception as e:
        logger.error(f"Error processing evaluación: {e}")
        raise HTTPException(status_code=502, detail=f"Error al procesar evaluación: {str(e)}")


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
    # In production, fetch from Supabase
    return {"id": evaluacion_id, "status": "not_implemented"}
