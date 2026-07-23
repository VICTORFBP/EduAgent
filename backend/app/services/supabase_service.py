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
            .select("id, docente_id, area, grados, tema, validada_docente, correcciones, created_at, agente_usado")
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

    async def delete_planeacion(self, planeacion_id: str) -> bool:
        """Delete a planeación by ID."""
        if not self.client:
            return True
        # Delete related evaluaciones first to avoid foreign key constraint error
        self.client.table("evaluaciones").delete().eq("planeacion_id", planeacion_id).execute()
        self.client.table("planeaciones").delete().eq("id", planeacion_id).execute()
        return True

    # ---- Evaluaciones ----

    async def get_evaluaciones(self, docente_id: str) -> list[dict]:
        if not self.client:
            return []
        response = (
            self.client.table("evaluaciones")
            .select("id, estudiante_id, estudiante_nombre, docente_id, area, tipo, archivo_path, nota, retroalimentacion, procesado_correctamente, error_ocr, created_at, planeacion_id, calificacion_manual, nota_ia")
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

    async def delete_evaluacion(self, evaluacion_id: str) -> bool:
        if not self.client:
            return True
        self.client.table("evaluaciones").delete().eq("id", evaluacion_id).execute()
        return True

    async def get_evaluacion_by_student_plan(self, estudiante_id: str, planeacion_id: str) -> dict | None:
        if not self.client:
            return None
        response = (
            self.client.table("evaluaciones")
            .select("*")
            .eq("estudiante_id", estudiante_id)
            .eq("planeacion_id", planeacion_id)
            .execute()
        )
        return response.data[0] if response.data else None

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

    async def create_estudiantes_bulk(self, data: list[dict]) -> list[dict]:
        """Bulk-insert a list of estudiantes in one Supabase request."""
        if not self.client:
            return data
        response = self.client.table("estudiantes").insert(data).execute()
        return response.data

    async def update_estudiante(self, estudiante_id: str, data: dict) -> dict | None:
        """Update an estudiante."""
        if not self.client:
            return None
        response = (
            self.client.table("estudiantes")
            .update(data)
            .eq("id", estudiante_id)
            .execute()
        )
        return response.data[0] if response.data else None

    async def delete_estudiante(self, estudiante_id: str) -> bool:
        if not self.client:
            return True
        self.client.table("estudiantes").delete().eq("id", estudiante_id).execute()
        return True

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

    async def get_pilot_metrics(self, docente_id: str) -> dict:
        """Calculate real pilot metrics for a specific docente."""
        if not self.client:
            return _empty_pilot_metrics()
        try:
            # --- Planeaciones ---
            planes = (
                self.client.table("planeaciones")
                .select("id, validada_docente, correcciones")
                .eq("docente_id", docente_id)
                .execute()
            )
            total_planes = len(planes.data) if planes.data else 0
            validadas = sum(1 for p in (planes.data or []) if p.get("validada_docente"))
            corregidas = sum(1 for p in (planes.data or []) if p.get("correcciones"))

            # --- Evaluaciones ---
            evals = (
                self.client.table("evaluaciones")
                .select("id, procesado_correctamente")
                .eq("docente_id", docente_id)
                .execute()
            )
            total_evals = len(evals.data) if evals.data else 0
            evals_ok = sum(1 for e in (evals.data or []) if e.get("procesado_correctamente"))

            # --- Tiempo promedio de planeación (desde interaction_logs) ---
            logs = (
                self.client.table("interaction_logs")
                .select("duracion_ms")
                .eq("docente_id", docente_id)
                .eq("modulo", "planeacion")
                .eq("exitoso", True)
                .execute()
            )
            tiempos = [r["duracion_ms"] for r in (logs.data or []) if r.get("duracion_ms")]
            tiempo_promedio_ms = int(sum(tiempos) / len(tiempos)) if tiempos else 0

            # Baseline: 2.5h (150 min = 9,000,000 ms) según el docente
            BASELINE_MS = 9_000_000
            tiempo_ahorrado_ms = max(0, BASELINE_MS - tiempo_promedio_ms) * total_planes
            tiempo_ahorrado_horas = round(tiempo_ahorrado_ms / 3_600_000, 1)

            # Tasa de alineación MEN: planeaciones validadas sin correcciones / total
            tasa_alineacion = round((validadas - corregidas) / total_planes * 100) if total_planes > 0 else 0
            tasa_correccion = round(corregidas / total_planes * 100) if total_planes > 0 else 0
            tasa_ocr = round(evals_ok / total_evals * 100) if total_evals > 0 else 0

            return {
                "tiempo_promedio_planeacion_ms": tiempo_promedio_ms,
                "tiempo_ahorrado_horas": tiempo_ahorrado_horas,
                "tasa_alineacion_men": max(0, min(100, tasa_alineacion)),
                "tasa_correccion_rag": max(0, min(100, tasa_correccion)),
                "tasa_exito_ocr": max(0, min(100, tasa_ocr)),
                "total_planeaciones": total_planes,
                "total_evaluaciones": total_evals,
                "total_evaluaciones_ok": evals_ok,
                "total_planeaciones_validadas": validadas,
                "total_planeaciones_corregidas": corregidas,
            }
        except Exception as e:
            logger.error(f"Error calculating pilot metrics for {docente_id}: {e}")
            return _empty_pilot_metrics()

    async def get_global_pilot_metrics(self) -> dict:
        """Aggregate pilot metrics across ALL docentes (admin only)."""
        if not self.client:
            return {"docentes": [], "global": _empty_pilot_metrics()}
        try:
            # All planeaciones
            all_planes = (
                self.client.table("planeaciones")
                .select("id, docente_id, validada_docente, correcciones, created_at")
                .order("created_at", desc=True)
                .execute()
            )
            # All evaluaciones
            all_evals = (
                self.client.table("evaluaciones")
                .select("id, docente_id, procesado_correctamente")
                .execute()
            )
            # Interaction logs for timing
            all_logs = (
                self.client.table("interaction_logs")
                .select("docente_id, modulo, duracion_ms, accion, exitoso, created_at")
                .eq("exitoso", True)
                .execute()
            )
            # Docentes list
            docentes_list = (
                self.client.table("docentes")
                .select("id, nombre")
                .execute()
            )

            docente_map = {d["id"]: d["nombre"] for d in (docentes_list.data or [])}

            # Group by docente
            from collections import defaultdict
            planes_by_doc = defaultdict(list)
            for p in (all_planes.data or []):
                planes_by_doc[p["docente_id"]].append(p)

            evals_by_doc = defaultdict(list)
            for e in (all_evals.data or []):
                evals_by_doc[e["docente_id"]].append(e)

            logs_by_doc = defaultdict(list)
            for l in (all_logs.data or []):
                if l["modulo"] == "planeacion":
                    logs_by_doc[l["docente_id"]].append(l)

            BASELINE_MS = 9_000_000
            docentes_metrics = []
            for doc_id, nombre in docente_map.items():
                planes = planes_by_doc[doc_id]
                evals = evals_by_doc[doc_id]
                logs = logs_by_doc[doc_id]

                total_p = len(planes)
                validadas = sum(1 for p in planes if p.get("validada_docente"))
                corregidas = sum(1 for p in planes if p.get("correcciones"))
                total_e = len(evals)
                evals_ok = sum(1 for e in evals if e.get("procesado_correctamente"))
                tiempos = [l["duracion_ms"] for l in logs if l.get("duracion_ms")]
                t_promedio = int(sum(tiempos) / len(tiempos)) if tiempos else 0
                t_ahorrado = round(max(0, BASELINE_MS - t_promedio) * total_p / 3_600_000, 1)

                docentes_metrics.append({
                    "docente_id": doc_id,
                    "nombre": nombre,
                    "total_planeaciones": total_p,
                    "planeaciones_validadas": validadas,
                    "planeaciones_corregidas": corregidas,
                    "tiempo_promedio_planeacion_ms": t_promedio,
                    "tiempo_ahorrado_horas": t_ahorrado,
                    "total_evaluaciones": total_e,
                    "evaluaciones_ok": evals_ok,
                    "tasa_ocr": round(evals_ok / total_e * 100) if total_e > 0 else 0,
                })

            # Global aggregates
            total_planes_g = len(all_planes.data or [])
            total_evals_g = len(all_evals.data or [])
            evals_ok_g = sum(1 for e in (all_evals.data or []) if e.get("procesado_correctamente"))
            validadas_g = sum(1 for p in (all_planes.data or []) if p.get("validada_docente"))
            corregidas_g = sum(1 for p in (all_planes.data or []) if p.get("correcciones"))
            all_tiempos = [l["duracion_ms"] for l in (all_logs.data or []) if l.get("modulo") == "planeacion" and l.get("duracion_ms")]
            t_prom_g = int(sum(all_tiempos) / len(all_tiempos)) if all_tiempos else 0

            return {
                "docentes": docentes_metrics,
                "global": {
                    "total_planeaciones": total_planes_g,
                    "total_evaluaciones": total_evals_g,
                    "total_evaluaciones_ok": evals_ok_g,
                    "total_planeaciones_validadas": validadas_g,
                    "total_planeaciones_corregidas": corregidas_g,
                    "tiempo_promedio_planeacion_ms": t_prom_g,
                    "tasa_alineacion_men": round((validadas_g - corregidas_g) / total_planes_g * 100) if total_planes_g > 0 else 0,
                    "tasa_correccion_rag": round(corregidas_g / total_planes_g * 100) if total_planes_g > 0 else 0,
                    "tasa_exito_ocr": round(evals_ok_g / total_evals_g * 100) if total_evals_g > 0 else 0,
                },
            }
        except Exception as e:
            logger.error(f"Error calculating global pilot metrics: {e}")
            return {"docentes": [], "global": _empty_pilot_metrics()}

    async def get_dashboard_init(self, docente_id: str) -> dict:
        """Fetch all dashboard data (stats, activity, pilot metrics) concurrently."""
        if not self.client:
            return {
                "metricas": self._empty_dashboard_stats(),
                "actividad": [],
                "pilot": _empty_pilot_metrics()
            }
        
        import asyncio
        from collections import defaultdict
        
        # We wrap the synchronous supabase-py calls in to_thread to run them concurrently
        # 1. Stats queries
        async def fetch_planeaciones_count():
            res = await asyncio.to_thread(lambda: self.client.table("planeaciones").select("id", count="exact").eq("docente_id", docente_id).execute())
            return res.count or 0
            
        async def fetch_evaluaciones_count():
            res = await asyncio.to_thread(lambda: self.client.table("evaluaciones").select("id", count="exact").eq("docente_id", docente_id).eq("procesado_correctamente", True).execute())
            return res.count or 0
            
        async def fetch_documentos_count():
            res = await asyncio.to_thread(lambda: self.client.table("documentos").select("id", count="exact").eq("docente_id", docente_id).execute())
            return res.count or 0
            
        async def fetch_estudiantes_count():
            res = await asyncio.to_thread(lambda: self.client.table("estudiantes").select("id", count="exact").eq("docente_id", docente_id).execute())
            return res.count or 0
            
        # 2. Activity queries
        async def fetch_act_planeaciones():
            try:
                res = await asyncio.to_thread(lambda: self.client.table("planeaciones").select("id, tema, area, created_at").eq("docente_id", docente_id).order("created_at", desc=True).limit(4).execute())
                return res.data
            except Exception:
                return []
                
        async def fetch_act_evaluaciones():
            try:
                res = await asyncio.to_thread(lambda: self.client.table("evaluaciones").select("id, estudiante_nombre, area, procesado_correctamente, created_at").eq("docente_id", docente_id).order("created_at", desc=True).limit(4).execute())
                return res.data
            except Exception:
                return []
                
        async def fetch_act_documentos():
            try:
                res = await asyncio.to_thread(lambda: self.client.table("documentos").select("id, nombre, created_at").eq("docente_id", docente_id).order("created_at", desc=True).limit(3).execute())
                return res.data
            except Exception:
                return []

        # 3. Pilot Metrics queries
        async def fetch_pilot_planes():
            try:
                res = await asyncio.to_thread(lambda: self.client.table("planeaciones").select("id, validada_docente, correcciones").eq("docente_id", docente_id).execute())
                return res.data
            except Exception:
                return []

        async def fetch_pilot_evals():
            try:
                res = await asyncio.to_thread(lambda: self.client.table("evaluaciones").select("id, procesado_correctamente").eq("docente_id", docente_id).execute())
                return res.data
            except Exception:
                return []

        async def fetch_pilot_logs():
            try:
                res = await asyncio.to_thread(lambda: self.client.table("interaction_logs").select("duracion_ms").eq("docente_id", docente_id).eq("modulo", "planeacion").eq("exitoso", True).execute())
                return res.data
            except Exception:
                return []

        # Run all 10 queries concurrently
        results = await asyncio.gather(
            fetch_planeaciones_count(),
            fetch_evaluaciones_count(),
            fetch_documentos_count(),
            fetch_estudiantes_count(),
            fetch_act_planeaciones(),
            fetch_act_evaluaciones(),
            fetch_act_documentos(),
            fetch_pilot_planes(),
            fetch_pilot_evals(),
            fetch_pilot_logs()
        )
        
        # --- Process Stats ---
        metricas = {
            "planeaciones_mes": results[0],
            "evaluaciones_procesadas": results[1],
            "documentos_cargados": results[2],
            "estudiantes_total": results[3],
        }
        
        # --- Process Activity ---
        activity = []
        for r in results[4]:
            activity.append({
                "id": r["id"], "tipo": "planeacion",
                "descripcion": f"Planeación generada: {r.get('tema', 'Sin tema')} ({r.get('area', 'Sin área')})",
                "timestamp": r["created_at"],
            })
        for r in results[5]:
            estado = "✅ Procesada" if r.get("procesado_correctamente") else "⏳ Procesando"
            activity.append({
                "id": r["id"], "tipo": "evaluacion",
                "descripcion": f"Evaluación {estado}: {r.get('estudiante_nombre', '')} — {r.get('area', '')}",
                "timestamp": r["created_at"],
            })
        for r in results[6]:
            activity.append({
                "id": r["id"], "tipo": "documento",
                "descripcion": f"Documento cargado: {r.get('nombre', 'Sin nombre')}",
                "timestamp": r["created_at"],
            })
        activity.sort(key=lambda x: x["timestamp"], reverse=True)
        activity = activity[:10]
        
        # --- Process Pilot Metrics ---
        planes_data = results[7]
        evals_data = results[8]
        logs_data = results[9]
        
        total_planes = len(planes_data)
        validadas = sum(1 for p in planes_data if p.get("validada_docente"))
        corregidas = sum(1 for p in planes_data if p.get("correcciones"))
        
        total_evals = len(evals_data)
        evals_ok = sum(1 for e in evals_data if e.get("procesado_correctamente"))
        
        tiempos = [r["duracion_ms"] for r in logs_data if r.get("duracion_ms")]
        tiempo_promedio_ms = int(sum(tiempos) / len(tiempos)) if tiempos else 0
        
        BASELINE_MS = 9_000_000
        tiempo_ahorrado_ms = max(0, BASELINE_MS - tiempo_promedio_ms) * total_planes
        tiempo_ahorrado_horas = round(tiempo_ahorrado_ms / 3_600_000, 1)
        
        tasa_alineacion = round((validadas - corregidas) / total_planes * 100) if total_planes > 0 else 0
        tasa_correccion = round(corregidas / total_planes * 100) if total_planes > 0 else 0
        tasa_ocr = round(evals_ok / total_evals * 100) if total_evals > 0 else 0
        
        pilot = {
            "tiempo_promedio_planeacion_ms": tiempo_promedio_ms,
            "tiempo_ahorrado_horas": tiempo_ahorrado_horas,
            "tasa_alineacion_men": max(0, min(100, tasa_alineacion)),
            "tasa_correccion_rag": max(0, min(100, tasa_correccion)),
            "tasa_exito_ocr": max(0, min(100, tasa_ocr)),
            "total_planeaciones": total_planes,
            "total_evaluaciones": total_evals,
            "total_evaluaciones_ok": evals_ok,
            "total_planeaciones_validadas": validadas,
            "total_planeaciones_corregidas": corregidas,
        }
        
        return {
            "metricas": metricas,
            "actividad": activity,
            "pilot": pilot
        }
        
    def _empty_dashboard_stats(self) -> dict:
        return {
            "planeaciones_mes": 0,
            "evaluaciones_procesadas": 0,
            "documentos_cargados": 0,
            "estudiantes_total": 0,
        }



def _empty_pilot_metrics() -> dict:
    """Return empty pilot metrics structure."""
    return {
        "tiempo_promedio_planeacion_ms": 0,
        "tiempo_ahorrado_horas": 0,
        "tasa_alineacion_men": 0,
        "tasa_correccion_rag": 0,
        "tasa_exito_ocr": 0,
        "total_planeaciones": 0,
        "total_evaluaciones": 0,
        "total_evaluaciones_ok": 0,
        "total_planeaciones_validadas": 0,
        "total_planeaciones_corregidas": 0,
    }


# Singleton instance
supabase_service = SupabaseService()
