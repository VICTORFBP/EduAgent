"""EduAgent — Pydantic Models for Evaluación."""

from pydantic import BaseModel, Field
from typing import Optional


class EvaluacionCreateRequest(BaseModel):
    """Request to process a student evaluation."""
    estudiante_id: str = Field(..., description="UUID del estudiante")
    area: str = Field(..., description="Área curricular")
    tipo: str = Field(..., pattern="^(estandarizada|abierta)$", description="Tipo: estandarizada o abierta")


class EvaluacionResponse(BaseModel):
    id: str
    estudiante_id: str
    docente_id: str
    area: str
    tipo: str
    archivo_path: Optional[str] = None
    nota: Optional[float] = None
    retroalimentacion: Optional[str] = None
    procesado_correctamente: bool
    error_ocr: Optional[str] = None
    planeacion_id: Optional[str] = None
    grado: Optional[int] = None
    created_at: str
