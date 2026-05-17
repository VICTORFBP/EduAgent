"""EduAgent — Supabase Service: Client for database operations."""

import logging
from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


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
        response = self.client.table("planeaciones").select("*").eq("docente_id", docente_id).order("created_at", desc=True).execute()
        return response.data

    async def get_planeacion(self, planeacion_id: str) -> dict | None:
        """Get a single planeación by ID."""
        if not self.client:
            return None
        response = self.client.table("planeaciones").select("*").eq("id", planeacion_id).single().execute()
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
        response = self.client.table("planeaciones").update(data).eq("id", planeacion_id).execute()
        return response.data[0]

    # ---- Evaluaciones ----

    async def get_evaluaciones(self, docente_id: str) -> list[dict]:
        if not self.client:
            return []
        response = self.client.table("evaluaciones").select("*").eq("docente_id", docente_id).order("created_at", desc=True).execute()
        return response.data

    async def create_evaluacion(self, data: dict) -> dict:
        if not self.client:
            return data
        response = self.client.table("evaluaciones").insert(data).execute()
        return response.data[0]

    # ---- Documentos ----

    async def get_documentos(self, docente_id: str) -> list[dict]:
        if not self.client:
            return []
        response = self.client.table("documentos").select("*").eq("docente_id", docente_id).order("created_at", desc=True).execute()
        return response.data

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
            response = self.client.table("documentos").select("*").eq("id", documento_id).single().execute()
            return response.data
        except Exception as e:
            logger.error(f"Error fetching documento {documento_id}: {e}")
            return None

    async def delete_documento(self, documento_id: str) -> bool:
        if not self.client:
            return True
        self.client.table("documentos").delete().eq("id", documento_id).execute()
        return True

    # ---- Estudiantes ----

    async def get_estudiantes(self, docente_id: str) -> list[dict]:
        if not self.client:
            return []
        # First get docente's assigned grades
        doc_res = self.client.table("docentes").select("grados_asignados").eq("id", docente_id).single().execute()
        if not doc_res.data:
            return []
        
        grados = doc_res.data.get("grados_asignados", [])
        if not grados:
            return []
            
        # Get students in those grades
        response = self.client.table("estudiantes").select("*").in_("grado", grados).order("grado").execute()
        return response.data

    # ---- Docentes / Admin ----

    async def get_docente_rol(self, docente_id: str) -> str:
        """Get the role of a user from the docentes table."""
        if not self.client:
            return "docente"
        try:
            response = self.client.table("docentes").select("rol").eq("id", docente_id).single().execute()
            return response.data.get("rol", "docente") if response.data else "docente"
        except Exception as e:
            logger.warning(f"Error getting docente rol: {e}")
            return "docente"

    # ---- Dashboard / Logs ----

    async def log_interaction(self, data: dict) -> dict:
        if not self.client:
            return data
        response = self.client.table("interaction_logs").insert(data).execute()
        return response.data[0]

    async def get_dashboard_stats(self, docente_id: str) -> dict:
        """Aggregate dashboard statistics."""
        if not self.client:
            return {
                "planeaciones_mes": 0,
                "evaluaciones_procesadas": 0,
                "documentos_cargados": 0,
                "estudiantes_total": 0,
            }
        # In production these would be actual aggregate queries
        planeaciones = self.client.table("planeaciones").select("id", count="exact").eq("docente_id", docente_id).execute()
        evaluaciones = self.client.table("evaluaciones").select("id", count="exact").eq("docente_id", docente_id).execute()
        documentos = self.client.table("documentos").select("id", count="exact").eq("docente_id", docente_id).execute()
        estudiantes = self.client.table("estudiantes").select("id", count="exact").eq("docente_id", docente_id).execute()

        return {
            "planeaciones_mes": planeaciones.count or 0,
            "evaluaciones_procesadas": evaluaciones.count or 0,
            "documentos_cargados": documentos.count or 0,
            "estudiantes_total": estudiantes.count or 0,
        }


# Singleton instance
supabase_service = SupabaseService()
