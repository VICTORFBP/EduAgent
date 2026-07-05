"""EduAgent — Agent Tools: Definitions and executors for AI function-calling."""

import logging

logger = logging.getLogger(__name__)

# ─── OpenAI Function Schemas ──────────────────────────────────────────────────

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "consultar_documentos",
            "description": (
                "Busca información en los documentos pedagógicos cargados en el sistema "
                "(lineamientos MEN, guías curriculares, documentos del docente). "
                "Úsala para responder preguntas sobre contenido curricular, metodologías, "
                "normatividad educativa, o cualquier tema relacionado con el material pedagógico."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "pregunta": {
                        "type": "string",
                        "description": "La pregunta o tema a buscar en los documentos pedagógicos",
                    }
                },
                "required": ["pregunta"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generar_planeacion",
            "description": (
                "Genera una planeación curricular completa usando IA y RAG. "
                "Produce un plan de clase con objetivos, actividades (apertura, desarrollo, cierre), "
                "diferenciación pedagógica y criterios de evaluación alineados con el MEN. "
                "Úsala cuando el docente quiera crear una nueva planeación de clase."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "area": {
                        "type": "string",
                        "description": "Área o materia.",
                        "enum": ["Matemáticas", "Lenguaje", "Ciencias Naturales", "Ciencias Sociales", "Ética", "Artística"],
                    },
                    "grados": {
                        "type": "array",
                        "items": {"type": "integer", "minimum": 1, "maximum": 5},
                        "description": "Lista de grados (1 a 5). Ej: [3] para grado 3, o [1,2] para multigrado.",
                    },
                    "tema": {
                        "type": "string",
                        "description": "Tema específico de la clase. Ej: 'Fracciones y decimales'.",
                    },
                    "duracion": {
                        "type": "integer",
                        "description": "Duración en minutos. Por defecto 60.",
                    },
                    "recursos": {
                        "type": "string",
                        "description": "Recursos disponibles. Por defecto 'tablero y cuadernos'.",
                    },
                },
                "required": ["area", "grados", "tema"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_planeaciones",
            "description": (
                "Obtiene la lista de planeaciones curriculares creadas por el docente. "
                "Muestra área, grado, tema, fecha y si fue validada. "
                "Úsala cuando el docente pregunte por sus planeaciones recientes o historial."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "limite": {
                        "type": "integer",
                        "description": "Cantidad máxima de planeaciones a retornar. Por defecto 10.",
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "listar_estudiantes",
            "description": (
                "Obtiene la lista de estudiantes registrados para el docente, "
                "con su nombre y grado. "
                "Úsala cuando el docente pregunte cuántos o cuáles estudiantes tiene."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "ver_estadisticas",
            "description": (
                "Muestra las estadísticas del docente: planeaciones generadas, "
                "evaluaciones procesadas, documentos cargados, estudiantes registrados "
                "y tiempo estimado ahorrado. "
                "Úsala cuando el docente pregunte por su progreso o métricas."
            ),
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    },
]


# ─── Tool Executors ───────────────────────────────────────────────────────────

async def _exec_consultar_documentos(args: dict, docente_id: str, session_id: str | None) -> str:
    from app.services.n8n_service import n8n_service

    pregunta = args.get("pregunta", "")
    try:
        raw = await n8n_service.trigger_consulta(
            pregunta=pregunta,
            docente_id=docente_id,
            session_id=session_id,
        )
        if isinstance(raw, dict) and "data" in raw:
            raw = raw["data"]
        if isinstance(raw, list) and raw:
            raw = raw[0]
        if isinstance(raw, dict):
            text = (
                raw.get("output")
                or raw.get("respuesta")
                or raw.get("answer")
                or raw.get("text")
                or raw.get("content")
                or ""
            )
            return text or "No se encontró información relevante en los documentos."
        return str(raw) if raw else "No se encontró información relevante en los documentos."
    except Exception as e:
        logger.error(f"consultar_documentos error: {e}")
        return f"No pude consultar los documentos en este momento. Error: {str(e)}"


async def _exec_generar_planeacion(args: dict, docente_id: str) -> str:
    from app.services.n8n_service import n8n_service
    from app.services.supabase_service import supabase_service
    from app.routers.planeacion import _get_skill_context
    import uuid

    area = args.get("area", "")
    grados = args.get("grados", [])
    tema = args.get("tema", "")
    duracion = args.get("duracion", 60)
    recursos = args.get("recursos", "tablero y cuadernos")

    try:
        skill_context = _get_skill_context(area)
        raw = await n8n_service.trigger_planeacion(
            area=area,
            grados=grados,
            tema=tema,
            duracion=duracion,
            recursos=recursos,
            docente_id=docente_id,
            skill_context=skill_context,
        )
        data = raw[0] if isinstance(raw, list) and raw else raw

        saved_id = None
        try:
            contenido = data.get("contenido_generado") or data
            insert_data = {
                "id": data.get("id") or str(uuid.uuid4()),
                "docente_id": docente_id,
                "area": area,
                "grados": grados,
                "tema": tema,
                "contenido_generado": contenido,
                "dba_referenciados": data.get("dba_referenciados", []),
                "agente_usado": data.get("agente_usado", "EduAgent-AI"),
                "tokens_consumidos": data.get("tokens_consumidos", 0),
                "validada_docente": False,
                "correcciones": None,
            }
            saved = await supabase_service.create_planeacion(insert_data)
            saved_id = saved.get("id")
        except Exception as save_err:
            logger.warning(f"No se pudo guardar la planeación: {save_err}")

        resumen = [
            f"✅ **Planeación generada** — **{area}**, Grado(s) {', '.join(str(g) for g in grados)}",
            f"📚 **Tema**: {tema}",
            f"⏱️ **Duración**: {duracion} min",
        ]
        if saved_id:
            resumen.append(f"💾 **Guardada** con ID: `{saved_id}`")

        contenido = data.get("contenido_generado") or data
        if isinstance(contenido, dict):
            if contenido.get("objetivo"):
                resumen.append(f"\n**Objetivo**: {contenido['objetivo'][:200]}...")
            actividades = contenido.get("actividades")
            if isinstance(actividades, dict) and actividades.get("apertura"):
                resumen.append(f"\n**Apertura**: {actividades['apertura'][:150]}...")

        resumen.append(
            "\n\nPuedes verla en **Planeación** para revisar el contenido completo, "
            "generar la actividad en PDF o refinarlo con feedback."
        )
        return "\n".join(resumen)
    except Exception as e:
        logger.error(f"generar_planeacion error: {e}")
        return f"Hubo un error al generar la planeación: {str(e)}"


async def _exec_listar_planeaciones(args: dict, docente_id: str) -> str:
    from app.services.supabase_service import supabase_service

    limite = args.get("limite", 10)
    try:
        planes = await supabase_service.get_planeaciones(docente_id)
        if not planes:
            return "No tienes planeaciones guardadas aún. ¡Puedo generar una ahora si me indicas el área, grado y tema!"

        planes = planes[:limite]
        lines = [f"📋 **Tus {len(planes)} planeaciones más recientes:**\n"]
        for i, p in enumerate(planes, 1):
            grados_str = ", ".join(f"G{g}" for g in (p.get("grados") or []))
            validada = "✅" if p.get("validada_docente") else "⏳"
            fecha = (p.get("created_at") or "")[:10]
            lines.append(
                f"{i}. {validada} **{p.get('tema', 'Sin tema')}** — {p.get('area', '')} ({grados_str}) · {fecha}"
            )
        lines.append("\nVe a **Planeación** en el menú para ver detalles, generar PDFs o agregar feedback.")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"listar_planeaciones error: {e}")
        return f"No pude obtener las planeaciones en este momento: {str(e)}"


async def _exec_listar_estudiantes(args: dict, docente_id: str) -> str:
    from app.services.supabase_service import supabase_service

    try:
        estudiantes = await supabase_service.get_estudiantes(docente_id)
        if not estudiantes:
            return "No tienes estudiantes registrados aún. Puedes agregarlos en la sección **Estudiantes**."

        by_grado: dict[int, list] = {}
        for e in estudiantes:
            g = e.get("grado", 0)
            by_grado.setdefault(g, []).append(e)

        lines = [f"👥 **Tienes {len(estudiantes)} estudiante(s) registrado(s):**\n"]
        for grado in sorted(by_grado.keys()):
            names = ", ".join(e.get("nombre", "Sin nombre") for e in by_grado[grado])
            lines.append(f"**Grado {grado}** ({len(by_grado[grado])}): {names}")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"listar_estudiantes error: {e}")
        return f"No pude obtener los estudiantes en este momento: {str(e)}"


async def _exec_ver_estadisticas(args: dict, docente_id: str) -> str:
    from app.services.supabase_service import supabase_service

    try:
        stats = await supabase_service.get_dashboard_stats(docente_id)
        pilot = await supabase_service.get_pilot_metrics(docente_id)

        lines = [
            "📊 **Tus estadísticas en EduAgent:**\n",
            f"📝 Planeaciones generadas: **{stats.get('planeaciones_mes', 0)}**",
            f"✅ Evaluaciones procesadas: **{stats.get('evaluaciones_procesadas', 0)}**",
            f"📂 Documentos cargados: **{stats.get('documentos_cargados', 0)}**",
            f"👥 Estudiantes registrados: **{stats.get('estudiantes_total', 0)}**",
        ]
        if pilot.get("tiempo_ahorrado_horas"):
            lines.append(f"⏱️ Tiempo estimado ahorrado: **{pilot['tiempo_ahorrado_horas']}h**")
        if pilot.get("tasa_alineacion_men"):
            lines.append(f"🎯 Alineación con MEN: **{pilot['tasa_alineacion_men']}%**")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"ver_estadisticas error: {e}")
        return f"No pude obtener las estadísticas en este momento: {str(e)}"


# ─── Dispatcher ───────────────────────────────────────────────────────────────

async def execute_tool(
    name: str,
    arguments: dict,
    docente_id: str,
    session_id: str | None = None,
) -> str:
    """Dispatch a tool call to its executor and return a string result."""
    dispatch = {
        "consultar_documentos": lambda a: _exec_consultar_documentos(a, docente_id, session_id),
        "generar_planeacion": lambda a: _exec_generar_planeacion(a, docente_id),
        "listar_planeaciones": lambda a: _exec_listar_planeaciones(a, docente_id),
        "listar_estudiantes": lambda a: _exec_listar_estudiantes(a, docente_id),
        "ver_estadisticas": lambda a: _exec_ver_estadisticas(a, docente_id),
    }
    executor = dispatch.get(name)
    if not executor:
        return f"Herramienta desconocida: {name}"
    return await executor(arguments)

