"""EduAgent — Documentos Router."""

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
async def upload_documento(
    nombre: str = Form(...),
    area: str = Form(None),
    grado: int = Form(None),
    archivo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """Upload a document PDF and trigger vectorization via n8n."""
    try:
        file_bytes = await archivo.read()
        filename = f"{uuid.uuid4()}_{archivo.filename}"
        storage_path = await storage_service.upload_documento(
            file_bytes, filename, current_user["id"]
        )

        user_id = current_user["id"]
        
        # Determine the document type based on user role
        user_role = await supabase_service.get_docente_rol(user_id)
        doc_tipo = "MEN_OFICIAL" if user_role == "admin" else "DOCENTE_CUSTOM"
        
        # If admin, the document is for all teachers technically, but we keep the uploader id
        # Create document record in Supabase
        doc_data = {
            "id": str(uuid.uuid4()),
            "docente_id": user_id,
            "nombre": nombre,
            "tipo": doc_tipo,
            "storage_path": storage_path,
            "area": area,
            "grado": grado,
            "vectorizado": False,
        }
        doc = await supabase_service.create_documento(doc_data)

        # Trigger n8n ingestion workflow (async)
        try:
            # Generate a signed URL for n8n to download the file directly
            bucket = storage_path.split("/")[0]
            rel_path = "/".join(storage_path.split("/")[1:])
            file_url = await storage_service.create_signed_url(bucket, rel_path)

            await n8n_service.trigger_ingesta(
                documento_id=doc_data["id"],
                storage_path=storage_path,
                area=area,
                grado=grado,
                file_url=file_url,
            )
        except Exception as e:
            logger.warning(f"n8n ingesta trigger failed (will retry): {e}")

        return doc
    except Exception as e:
        logger.error(f"Error uploading documento: {e}")
        raise HTTPException(status_code=500, detail=f"Error al cargar documento: {str(e)}")


@router.get("/")
async def list_documentos(current_user: dict = Depends(get_current_user)):
    """List all documents for the current docente."""
    return await supabase_service.get_documentos(current_user["id"])


@router.delete("/{documento_id}")
async def delete_documento(
    documento_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a document."""
    await supabase_service.delete_documento(documento_id)
    return {"deleted": True}


@router.post("/{documento_id}/reprocesar")
async def reprocesar_documento(
    documento_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Trigger vectorization again for an existing document."""
    try:
        # Get document info
        doc = await supabase_service.get_documento_by_id(documento_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Documento no encontrado")

        # Generate a signed URL for n8n
        storage_path = doc["storage_path"]
        bucket = storage_path.split("/")[0]
        rel_path = "/".join(storage_path.split("/")[1:])
        file_url = await storage_service.create_signed_url(bucket, rel_path)

        # Trigger n8n ingestion workflow
        await n8n_service.trigger_ingesta(
            documento_id=doc["id"],
            storage_path=storage_path,
            area=doc.get("area"),
            grado=doc.get("grado"),
            file_url=file_url,
        )

        return {"status": "Reprocesamiento iniciado", "id": documento_id}
    except Exception as e:
        logger.error(f"Error reprocesando documento {documento_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error al iniciar reprocesamiento: {str(e)}")
