"""EduAgent — Pydantic Models for Documentos."""

from pydantic import BaseModel, Field
from typing import Optional


class DocumentoCreateRequest(BaseModel):
    """Request to upload a new document."""
    nombre: str = Field(..., min_length=3, description="Nombre del documento")
    area: Optional[str] = Field(None, description="Área curricular")
    grado: Optional[int] = Field(None, ge=1, le=5, description="Grado (1-5)")


class DocumentoResponse(BaseModel):
    id: str
    docente_id: str
    nombre: str
    tipo: str
    storage_path: str
    area: Optional[str] = None
    grado: Optional[int] = None
    vectorizado: bool
    created_at: str
