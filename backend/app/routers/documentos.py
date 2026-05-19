"""EduAgent — Documentos Router."""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from typing import List, Optional

from app.middleware.auth_middleware import get_current_user
from app.services.supabase_service import (
    supabase_service,
    DOCENTE_MAX_DOCS,
    DOCENTE_MAX_FILE_MB,
)
from app.services.n8n_service import n8n_service
from app.services.storage_service import storage_service, ALLOWED_DOCUMENT_MIMES

logger = logging.getLogger(__name__)
router = APIRouter()

MAX_BATCH_FILES = 5  # Max files per batch upload for docentes


async def _trigger_ingesta_background(
    doc_id: str, storage_path: str, area: Optional[str], grado: Optional[int]
) -> None:
    """Fire-and-forget: trigger n8n vectorization; errors are logged only."""
    try:
        bucket = storage_path.split("/")[0]
        rel_path = "/".join(storage_path.split("/")[1:])
        file_url = await storage_service.create_signed_url(bucket, rel_path)
        await n8n_service.trigger_ingesta(
            documento_id=doc_id,
            storage_path=storage_path,
            area=area,
            grado=grado,
            file_url=file_url,
        )
    except Exception as e:
        logger.warning(f"n8n ingesta trigger failed for {doc_id}: {e}")


# ──────────────────────────────────────────────
# Upload single document
# ──────────────────────────────────────────────

@router.post("/")
async def upload_documento(
    background_tasks: BackgroundTasks,
    nombre: str = Form(...),
    area: Optional[str] = Form(None),
    grado: Optional[int] = Form(None),
    archivo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a document.
    - Admin  → MEN_OFICIAL type, triggers vectorization via n8n.
    - Docente → DOCENTE_CUSTOM type, stored for temporary AI analysis only.
                Enforces max 10 docs / 50 MB per file.
    """
    user_id = current_user["id"]
    user_role = await supabase_service.get_docente_rol(user_id)
    is_admin = user_role == "admin"

    # Validate content type
    content_type = archivo.content_type or ""
    if not is_admin and content_type not in ALLOWED_DOCUMENT_MIMES:
        raise HTTPException(
            status_code=415,
            detail=f"Tipo de archivo no permitido: {content_type}. "
                   f"Usa PDF, JPG, PNG o WEBP.",
        )

    file_bytes = await archivo.read()

    # Enforce file size limit for docentes
    if not is_admin:
        size_mb = len(file_bytes) / (1024 * 1024)
        if size_mb > DOCENTE_MAX_FILE_MB:
            raise HTTPException(
                status_code=413,
                detail=f"Archivo demasiado grande ({size_mb:.1f} MB). "
                       f"Límite: {DOCENTE_MAX_FILE_MB} MB.",
            )
        # Enforce document count limit
        doc_count = await supabase_service.get_docente_documento_count(user_id)
        if doc_count >= DOCENTE_MAX_DOCS:
            raise HTTPException(
                status_code=429,
                detail=f"Has alcanzado el límite de {DOCENTE_MAX_DOCS} documentos. "
                       f"Elimina alguno antes de subir otro.",
            )

    filename = f"{uuid.uuid4()}_{archivo.filename}"
    storage_path = await storage_service.upload_documento(
        file_bytes, filename, user_id, content_type
    )

    doc_data = {
        "id": str(uuid.uuid4()),
        "docente_id": user_id,
        "nombre": nombre,
        "tipo": "MEN_OFICIAL" if is_admin else "DOCENTE_CUSTOM",
        "storage_path": storage_path,
        "area": area,
        "grado": grado,
        "vectorizado": False,
    }
    doc = await supabase_service.create_documento(doc_data)

    # Only admin documents get vectorized
    if is_admin:
        background_tasks.add_task(
            _trigger_ingesta_background,
            doc_data["id"],
            storage_path,
            area,
            grado,
        )

    return doc


# ──────────────────────────────────────────────
# Batch upload (docentes — up to 5 files)
# ──────────────────────────────────────────────

@router.post("/batch")
async def upload_documentos_batch(
    background_tasks: BackgroundTasks,
    archivos: List[UploadFile] = File(...),
    area: Optional[str] = Form(None),
    grado: Optional[int] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    """
    Batch upload multiple files (docentes only).
    Each file gets its own DB record. Names derived from filename.
    Max 5 files per request.
    """
    user_id = current_user["id"]
    user_role = await supabase_service.get_docente_rol(user_id)
    is_admin = user_role == "admin"

    if len(archivos) > MAX_BATCH_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"Máximo {MAX_BATCH_FILES} archivos por lote.",
        )

    # Check quota upfront
    if not is_admin:
        doc_count = await supabase_service.get_docente_documento_count(user_id)
        if doc_count + len(archivos) > DOCENTE_MAX_DOCS:
            raise HTTPException(
                status_code=429,
                detail=f"Excedería el límite de {DOCENTE_MAX_DOCS} documentos. "
                       f"Tienes {doc_count} actualmente.",
            )

    results = []
    for archivo in archivos:
        content_type = archivo.content_type or ""
        if not is_admin and content_type not in ALLOWED_DOCUMENT_MIMES:
            results.append({"filename": archivo.filename, "error": f"Tipo no permitido: {content_type}"})
            continue

        file_bytes = await archivo.read()

        if not is_admin:
            size_mb = len(file_bytes) / (1024 * 1024)
            if size_mb > DOCENTE_MAX_FILE_MB:
                results.append({
                    "filename": archivo.filename,
                    "error": f"Archivo demasiado grande ({size_mb:.1f} MB)",
                })
                continue

        filename = f"{uuid.uuid4()}_{archivo.filename}"
        storage_path = await storage_service.upload_documento(
            file_bytes, filename, user_id, content_type
        )

        # Derive name from original filename (strip uuid4 prefix)
        nombre = archivo.filename or filename

        doc_data = {
            "id": str(uuid.uuid4()),
            "docente_id": user_id,
            "nombre": nombre,
            "tipo": "MEN_OFICIAL" if is_admin else "DOCENTE_CUSTOM",
            "storage_path": storage_path,
            "area": area,
            "grado": grado,
            "vectorizado": False,
        }
        doc = await supabase_service.create_documento(doc_data)

        if is_admin:
            background_tasks.add_task(
                _trigger_ingesta_background,
                doc_data["id"],
                storage_path,
                area,
                grado,
            )

        results.append({"filename": archivo.filename, "doc": doc})

    return {"uploaded": len([r for r in results if "doc" in r]), "results": results}


# ──────────────────────────────────────────────
# List documents
# ──────────────────────────────────────────────

@router.get("/")
async def list_documentos(current_user: dict = Depends(get_current_user)):
    """
    List documents:
    - All MEN_OFICIAL documents (admin + shared)
    - The current docente's own DOCENTE_CUSTOM documents
    """
    return await supabase_service.get_documentos(current_user["id"])


# ──────────────────────────────────────────────
# Delete document
# ──────────────────────────────────────────────

@router.delete("/{documento_id}")
async def delete_documento(
    documento_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete a document. Docentes can only delete their own DOCENTE_CUSTOM docs.
    Admins can delete any document.
    """
    user_id = current_user["id"]
    user_role = await supabase_service.get_docente_rol(user_id)
    doc = await supabase_service.get_documento_by_id(documento_id)

    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")

    if user_role != "admin" and doc.get("docente_id") != user_id:
        raise HTTPException(
            status_code=403,
            detail="No tienes permiso para eliminar este documento.",
        )

    # Also remove from storage
    storage_path = doc.get("storage_path", "")
    if storage_path:
        bucket = storage_path.split("/")[0]
        await storage_service.delete_file(bucket, storage_path)

    await supabase_service.delete_documento(documento_id)
    return {"deleted": True, "id": documento_id}


# ──────────────────────────────────────────────
# Reprocesar (admin only)
# ──────────────────────────────────────────────

@router.post("/{documento_id}/reprocesar")
async def reprocesar_documento(
    documento_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """Re-trigger vectorization for a MEN_OFICIAL document (admin only)."""
    user_role = await supabase_service.get_docente_rol(current_user["id"])
    if user_role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Solo el administrador puede reprocesar documentos.",
        )

    doc = await supabase_service.get_documento_by_id(documento_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento no encontrado.")
    if doc.get("tipo") != "MEN_OFICIAL":
        raise HTTPException(
            status_code=400,
            detail="Solo se pueden reprocesar documentos oficiales MEN.",
        )

    # Reset vectorizado flag
    await supabase_service.update_documento_vectorizado(documento_id, False)

    background_tasks.add_task(
        _trigger_ingesta_background,
        doc["id"],
        doc["storage_path"],
        doc.get("area"),
        doc.get("grado"),
    )

    return {"status": "Reprocesamiento iniciado", "id": documento_id}
