"""EduAgent — Supabase Service: Client for database operations."""

import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Limits for docente-owned documents (Supabase Free tier)
DOCENTE_MAX_DOCS = 10
DOCENTE_MAX_FILE_MB = 50


class SupabaseService:
    """
    Supabase client wrapper for database operations.
    Uses the service role key for server-side access (bypasses RLS).
    """

    def __init__(self):
        self._client = None

    @property
    def client(self):
        """Lazy initialization of the Supabase client."""
        if self._client is None:
            try:
                from supabase import create_client
                self._client = create_client(
                    settings.supabase_url,
                    settings.supabase_service_key,
                )
            except Exception as e:
                logger.warning(f"Supabase client not available: {e}")
                return None
        return self._client

    # ---- Planeaciones ----

    async def get_planeaciones(self, docente_id: str) -> list[dict]:
        """Get all planeaciones for a docente."""
        if not self.client:
            return []
        response = (
            self.client.table("planeaciones")
            .select("*")
            .eq("docente_id", docente_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data

    async def get_planeacion(self, planeacion_id: str) -> dict | None:
        """Get a single planeación by ID."""
        if not self.client:
            return None
        response = (
            self.client.table("planeaciones")
            .select("*")
            .eq("id", planeacion_id)
            .single()
            .execute()
        )
        return response.data

    async def create_planeacion(self, data: dict) -> dict:
        """Insert a new planeación."""
        if not self.client:
            return data
        response = self.client.table("planeaciones").insert(data).execute()
        return response.data[0]

    async def update_planeacion(self, planeacion_id: str, data: dict) -> dict:
        """Update a planeación."""
        if not self.client:
            return data
        response = (
            self.client.table("planeaciones")
            .update(data)
            .eq("id", planeacion_id)
            .execute()
        )
        return response.data[0]

    # ---- Evaluaciones ----

    async def get_evaluaciones(self, docente_id: str) -> list[dict]:
        if not self.client:
            return []
        response = (
            self.client.table("evaluaciones")
            .select("*")
            .eq("docente_id", docente_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data

    async def create_evaluacion(self, data: dict) -> dict:
        if not self.client:
            return data
        response = self.client.table("evaluaciones").insert(data).execute()
        return response.data[0]

    async def get_evaluacion(self, evaluacion_id: str) -> dict | None:
        """Get a single evaluación by ID."""
        if not self.client:
            return None
        try:
            response = (
                self.client.table("evaluaciones")
                .select("*")
                .eq("id", evaluacion_id)
                .single()
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching evaluación {evaluacion_id}: {e}")
            return None

    async def update_evaluacion(self, evaluacion_id: str, data: dict) -> dict | None:
        """Update evaluation results (called from n8n callback)."""
        if not self.client:
            return None
        try:
            response = (
                self.client.table("evaluaciones")
                .update(data)
                .eq("id", evaluacion_id)
                .execute()
            )
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating evaluación {evaluacion_id}: {e}")
            return None

    # ---- Documentos ----

    async def get_documentos(self, docente_id: str) -> list[dict]:
        """
        Get documents for a docente:
        - All MEN_OFICIAL documents (uploaded by admin, shared with everyone)
        - The docente's own DOCENTE_CUSTOM documents
        """
        if not self.client:
            return []
        response = (
            self.client.table("documentos")
            .select("*")
            .or_(f"tipo.eq.MEN_OFICIAL,docente_id.eq.{docente_id}")
            .order("created_at", desc=True)
            .execute()
        )
        return response.data

    async def get_docente_documento_count(self, docente_id: str) -> int:
        """Count how many DOCENTE_CUSTOM documents a docente has."""
        if not self.client:
            return 0
        response = (
            self.client.table("documentos")
            .select("id", count="exact")
            .eq("docente_id", docente_id)
            .eq("tipo", "DOCENTE_CUSTOM")
            .execute()
        )
        return response.count or 0

    async def create_documento(self, data: dict) -> dict:
        if not self.client:
            return data
        response = self.client.table("documentos").insert(data).execute()
        return response.data[0]

    async def get_documento_by_id(self, documento_id: str) -> dict | None:
        """Get a document by its ID."""
        if not self.client:
            return None
        try:
            response = (
                self.client.table("documentos")
                .select("*")
                .eq("id", documento_id)
                .single()
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching documento {documento_id}: {e}")
            return None

    async def update_documento_vectorizado(
        self, documento_id: str, vectorizado: bool = True
    ) -> bool:
        """Mark a document as vectorized (called from n8n callback)."""
        if not self.client:
            return False
        try:
            self.client.table("documentos").update(
                {"vectorizado": vectorizado}
            ).eq("id", documento_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating vectorizado for {documento_id}: {e}")
            return False

    async def link_document_chunks(self, documento_id: str) -> int:
        """Assign documento_id to any newly inserted vector chunks that are orphaned."""
        if not self.client:
            return 0
        try:
            response = (
                self.client.table("document_chunks")
                .update({"documento_id": documento_id})
                .eq("metadata->>documento_id", documento_id)
                .is_("documento_id", "null")
                .execute()
            )
            return len(response.data) if response.data else 0
        except Exception as e:
            logger.error(f"Error linking document chunks for {documento_id}: {e}")
            return 0

    async def delete_documento(self, documento_id: str) -> bool:
        if not self.client:
            return True
        self.client.table("documentos").delete().eq("id", documento_id).execute()
        return True

    # ---- Estudiantes ----

    async def get_estudiantes(self, docente_id: str) -> list[dict]:
        """Get students assigned to a docente (by docente_id directly)."""
        if not self.client:
            return []
        response = (
            self.client.table("estudiantes")
            .select("*")
            .eq("docente_id", docente_id)
            .order("grado")
            .execute()
        )
        return response.data

    async def get_all_estudiantes(self) -> list[dict]:
        """Get all estudiantes with sede info (admin only)."""
        if not self.client:
            return []
        response = (
            self.client.table("estudiantes")
            .select("*, sedes(nombre)")
            .order("sede_id")
            .order("grado")
            .execute()
        )
        return response.data

    async def create_estudiante(self, data: dict) -> dict:
        if not self.client:
            return data
        response = self.client.table("estudiantes").insert(data).execute()
        return response.data[0]

    async def delete_estudiante(self, estudiante_id: str) -> bool:
        if not self.client:
            return True
        self.client.table("estudiantes").delete().eq("id", estudiante_id).execute()
        return True

    # ---- Sedes ----

    async def get_sedes(self) -> list[dict]:
        """Get all sedes."""
        if not self.client:
            return []
        response = (
            self.client.table("sedes")
            .select("*")
            .eq("activa", True)
            .order("nombre")
            .execute()
        )
        return response.data

    async def create_sede(self, data: dict) -> dict:
        """Create a new sede."""
        if not self.client:
            return data
        response = self.client.table("sedes").insert(data).execute()
        return response.data[0]

    async def update_sede(self, sede_id: str, data: dict) -> dict | None:
        """Update a sede."""
        if not self.client:
            return None
        response = (
            self.client.table("sedes")
            .update(data)
            .eq("id", sede_id)
            .execute()
        )
        return response.data[0] if response.data else None

    # ---- Docentes / Admin ----

    async def get_docente(self, docente_id: str) -> dict | None:
        """Get docente profile by ID."""
        if not self.client:
            return None
        try:
            response = (
                self.client.table("docentes")
                .select("*, sedes(id, nombre, municipio)")
                .eq("id", docente_id)
                .single()
                .execute()
            )
            return response.data
        except Exception as e:
            logger.error(f"Error fetching docente {docente_id}: {e}")
            return None

    async def get_docente_rol(self, docente_id: str) -> str:
        """Get the role of a user from the docentes table."""
        if not self.client:
            return "docente"
        try:
            response = (
                self.client.table("docentes")
                .select("rol")
                .eq("id", docente_id)
                .single()
                .execute()
            )
            return response.data.get("rol", "docente") if response.data else "docente"
        except Exception as e:
            logger.warning(f"Error getting docente rol: {e}")
            return "docente"

    async def get_all_docentes(self) -> list[dict]:
        """Get all docentes with sede info (admin only)."""
        if not self.client:
            return []
        response = (
            self.client.table("docentes")
            .select("id, nombre, grados_asignados, areas_asignadas, rol, sede_id, sedes(nombre, municipio)")
            .order("sede_id")
            .execute()
        )
        return response.data

    async def delete_docente_profile(self, docente_id: str) -> bool:
        """Delete docente profile row (auth user must be deleted separately)."""
        if not self.client:
            return True
        self.client.table("docentes").delete().eq("id", docente_id).execute()
        return True

    # ---- Dashboard / Logs ----

    async def log_interaction(self, data: dict) -> dict:
        if not self.client:
            return data
        response = self.client.table("interaction_logs").insert(data).execute()
        return response.data[0]

    async def get_recent_activity(self, docente_id: str, limit: int = 10) -> list[dict]:
        """Get recent activity by combining latest planeaciones, evaluaciones, documentos."""
        if not self.client:
            return []
        activity = []
        try:
            p = (
                self.client.table("planeaciones")
                .select("id, tema, area, created_at")
                .eq("docente_id", docente_id)
                .order("created_at", desc=True)
                .limit(4)
                .execute()
            )
            for r in p.data:
                activity.append({
                    "id": r["id"], "tipo": "planeacion",
                    "descripcion": f"Planeación generada: {r['tema']} ({r['area']})",
                    "timestamp": r["created_at"],
                })
        except Exception:
            pass
        try:
            e = (
                self.client.table("evaluaciones")
                .select("id, estudiante_nombre, area, procesado_correctamente, created_at")
                .eq("docente_id", docente_id)
                .order("created_at", desc=True)
                .limit(4)
                .execute()
            )
            for r in e.data:
                estado = "✅ Procesada" if r.get("procesado_correctamente") else "⏳ Procesando"
                activity.append({
                    "id": r["id"], "tipo": "evaluacion",
                    "descripcion": f"Evaluación {estado}: {r.get('estudiante_nombre', '')} — {r['area']}",
                    "timestamp": r["created_at"],
                })
        except Exception:
            pass
        try:
            d = (
                self.client.table("documentos")
                .select("id, nombre, created_at")
                .eq("docente_id", docente_id)
                .order("created_at", desc=True)
                .limit(3)
                .execute()
            )
            for r in d.data:
                activity.append({
                    "id": r["id"], "tipo": "documento",
                    "descripcion": f"Documento cargado: {r['nombre']}",
                    "timestamp": r["created_at"],
                })
        except Exception:
            pass

        activity.sort(key=lambda x: x["timestamp"], reverse=True)
        return activity[:limit]

    async def get_dashboard_stats(self, docente_id: str) -> dict:
        """Aggregate dashboard statistics for a docente."""
        if not self.client:
            return {
                "planeaciones_mes": 0,
                "evaluaciones_procesadas": 0,
                "documentos_cargados": 0,
                "estudiantes_total": 0,
            }
        planeaciones = (
            self.client.table("planeaciones")
            .select("id", count="exact")
            .eq("docente_id", docente_id)
            .execute()
        )
        evaluaciones = (
            self.client.table("evaluaciones")
            .select("id", count="exact")
            .eq("docente_id", docente_id)
            .eq("procesado_correctamente", True)
            .execute()
        )
        documentos = (
            self.client.table("documentos")
            .select("id", count="exact")
            .eq("docente_id", docente_id)
            .execute()
        )
        estudiantes = (
            self.client.table("estudiantes")
            .select("id", count="exact")
            .eq("docente_id", docente_id)
            .execute()
        )

        return {
            "planeaciones_mes": planeaciones.count or 0,
            "evaluaciones_procesadas": evaluaciones.count or 0,
            "documentos_cargados": documentos.count or 0,
            "estudiantes_total": estudiantes.count or 0,
        }


# Singleton instance
supabase_service = SupabaseService()
