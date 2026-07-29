"""EduAgent — Pydantic Models for Planeación."""

from pydantic import BaseModel, Field
from typing import Optional


class PlaneacionCreateRequest(BaseModel):
    """Request to generate a new planeación via RAG agent."""
    area: str = Field(..., description="Área curricular")
    grados: list[int] = Field(..., description="Grados seleccionados (1-5)")
    tema: str = Field(..., min_length=3, description="Tema de la planeación")
    duracion: int = Field(2, ge=1, le=8, description="Duración en horas")
    recursos: str = Field("", description="Recursos disponibles")
    tipo_actividad: Optional[str] = Field(None, description="Tipo de actividad o instrucciones de formato")
    parent_plan_id: Optional[str] = Field(None, description="ID de la planeación padre para refinamiento")
    feedback: Optional[str] = Field(None, description="Comentarios de retroalimentación para refinamiento")
    documento_ids: Optional[list[str]] = Field(
        None,
        description="IDs de documentos DOCENTE_CUSTOM a usar como referencia directa (sin vectorización)",
    )


class IndicadorLogro(BaseModel):
    grado: int
    indicador: str


class ActividadesPlaneacion(BaseModel):
    apertura: str
    desarrollo: str
    cierre: str


class ContenidoPlaneacion(BaseModel):
    objetivo: str
    dba_citado: str
    indicadores: list[IndicadorLogro]
    actividades: ActividadesPlaneacion
    diferenciacion: str
    criterios_evaluacion: str
    estandar_men: str


class PlaneacionResponse(BaseModel):
    id: str
    docente_id: str
    area: str
    grados: list[int]
    tema: str
    contenido_generado: ContenidoPlaneacion
    dba_referenciados: list[str]
    agente_usado: str
    tokens_consumidos: int
    validada_docente: bool
    correcciones: Optional[str] = None
    actividad_generada: Optional[dict] = None
    created_at: str


class PlaneacionListResponse(BaseModel):
    id: str
    docente_id: str
    area: str
    grados: list[int]
    tema: str
    validada_docente: bool
    correcciones: Optional[str] = None
    created_at: str
    agente_usado: str


class PlaneacionValidateRequest(BaseModel):
    """Request to validate or correct a planeación."""
    validada_docente: bool
    correcciones: Optional[str] = None
    contenido_generado: Optional[ContenidoPlaneacion] = None

