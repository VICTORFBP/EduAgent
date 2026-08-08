"""EduAgent — Agent Tools: Definitions and executors for AI function-calling."""

import logging

logger = logging.getLogger(__name__)

# ─── OpenAI Function Schemas ──────────────────────────────────────────────────

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "buscar_en_internet",
            "description": (
                "Busca en internet información educativa actualizada, conceptos pedagógicos, "
                "ejemplos o explicaciones temáticas. Úsala cuando la pregunta requiera datos recientes, "
                "investigación sobre un tema pedagógico específico o información que no esté en los documentos locales."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "consulta": {
                        "type": "string",
                        "description": "La consulta o tema a buscar en internet.",
                    }
                },
                "required": ["consulta"],
            },
        },
    },
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
                "Si el docente ha subido documentos propios (guías, material de clase), puede adjuntarlos "
                "como referencia directa indicando sus IDs. "
                "Úsala cuando el docente quiera crear una nueva planeación de clase."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "area": {
                        "type": "string",
                        "description": "Área o materia. Comunes: Matemáticas, Lenguaje, Ciencias Naturales, Ciencias Sociales, Ética, Artística, Inglés, Tecnología e Informática, Educación Física. También acepta cualquier otra materia que el docente indique.",
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
                    "documento_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "IDs de documentos propios del docente a usar como referencia directa.",
                    },
                },
                "required": ["area", "grados", "tema"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "generar_actividad",
            "description": (
                "Diseña y genera una guía de trabajo, taller práctico o actividad impresa descargable para los estudiantes, "
                "diferenciada por grado, con ejercicios prácticos, lecturas, casillas de opción múltiple, tablas V/F y espacios de respuesta. "
                "Úsala cuando el docente pida crear una actividad, taller, guía o ficha de trabajo para sus estudiantes."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "area": {
                        "type": "string",
                        "description": "Área o materia (ej. Matemáticas, Lenguaje, Ciencias).",
                    },
                    "grados": {
                        "type": "array",
                        "items": {"type": "integer", "minimum": 1, "maximum": 5},
                        "description": "Lista de grados (1 a 5).",
                    },
                    "tema": {
                        "type": "string",
                        "description": "Tema específico de la actividad.",
                    },
                    "tipo_actividad": {
                        "type": "string",
                        "description": "Instrucciones específicas del docente sobre qué incluir en la guía (ej. comprensión lectora, ejercicios de dibujo, V/F, etc.).",
                    },
                    "planeacion_id": {
                        "type": "string",
                        "description": "ID de la planeación vinculada si ya existe.",
                    },
                    "documento_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "IDs de materiales o documentos de referencia adjuntos.",
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
    {
        "type": "function",
        "function": {
            "name": "listar_evaluaciones",
            "description": (
                "Obtiene la lista de evaluaciones del docente, mostrando estudiante, área, "
                "tipo, nota, estado de procesamiento y si fue calificada manualmente. "
                "Úsala cuando el docente pregunte por sus evaluaciones, notas de estudiantes, "
                "evaluaciones pendientes de calificar, o resúmenes de calificaciones."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "limite": {
                        "type": "integer",
                        "description": "Cantidad máxima de evaluaciones a retornar. Por defecto 10.",
                    },
                    "solo_pendientes": {
                        "type": "boolean",
                        "description": "Si true, retorna solo las evaluaciones que no están procesadas o no tienen nota. Por defecto false.",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calificar_evaluacion",
            "description": (
                "Califica manualmente una evaluación específica, asignando nota y retroalimentación. "
                "Si la evaluación ya tenía una nota de IA, la preserva como referencia. "
                "Úsala cuando el docente quiera asignar o corregir la nota de un estudiante."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "evaluacion_id": {
                        "type": "string",
                        "description": "ID de la evaluación a calificar.",
                    },
                    "nota": {
                        "type": "number",
                        "description": "Nota a asignar, de 0 a 10.",
                    },
                    "retroalimentacion": {
                        "type": "string",
                        "description": "Comentario de retroalimentación para el estudiante. Opcional.",
                    },
                },
                "required": ["evaluacion_id", "nota"],
            },
        },
    },
]


async def _exec_buscar_en_internet(args: dict, docente_id: str, session_id: str | None) -> str:
    from app.services.openai_service import openai_service

    consulta = args.get("consulta", "")
    if not consulta:
        return "Por favor indica qué deseas buscar en internet."

    try:
        resultado = await openai_service.research_topic(
            area="General",
            grados=[1, 2, 3, 4, 5],
            tema=consulta,
        )
        return resultado or f"No se encontró información suficiente en la web para la consulta '{consulta}'."
    except Exception as e:
        logger.error(f"buscar_en_internet error: {e}")
        return f"No pude realizar la búsqueda en internet en este momento: {str(e)}"


async def _exec_consultar_documentos(args: dict, docente_id: str, session_id: str | None) -> str:
    from app.services.openai_service import openai_service
    from app.services.rag_service import rag_service

    pregunta = args.get("pregunta", "")
    try:
        # Buscamos en todo el conocimiento del colegio (por ahora sin filtro estricto de área)
        rag_results = await rag_service.search_documents(
            query=pregunta,
            top_k=5,
        )
        rag_context = "\n\n".join([r["content"] for r in rag_results]) if rag_results else ""

        respuesta = await openai_service.chat_rag(
            pregunta=pregunta,
            rag_context=rag_context
        )
        
        return respuesta or "No se encontró información relevante en los documentos."
    except Exception as e:
        logger.error(f"consultar_documentos error: {e}")
        return f"No pude consultar los documentos en este momento. Error: {str(e)}"


async def _exec_generar_planeacion(args: dict, docente_id: str) -> str:
    from app.services.openai_service import openai_service
    from app.services.rag_service import rag_service
    from app.services.supabase_service import supabase_service
    from app.routers.planeacion import _get_skill_context
    import uuid

    area = args.get("area", "")
    grados = args.get("grados", [])
    tema = args.get("tema", "")
    duracion = args.get("duracion", 60)
    recursos = args.get("recursos", "tablero y cuadernos")
    documento_ids = args.get("documento_ids") or []

    try:
        skill_context = _get_skill_context(area)

        # RAG context for standards
        rag_query = f"{area} grado {', '.join(str(g) for g in grados)} {tema}"
        rag_results = await rag_service.search_documents(rag_query, top_k=5)
        rag_context = "\n\n".join([r["content"] for r in rag_results]) if rag_results else None

        # Resolve documento_ids → text for direct reference
        reference_context = None
        doc_names = []
        if documento_ids:
            texts = await supabase_service.get_documentos_text_content(
                docente_id, documento_ids
            )
            reference_context = "\n\n".join(texts) if texts else None
            
            # Get document names for the summary
            for did in documento_ids:
                doc_info = await supabase_service.get_documento_by_id(did)
                if doc_info and doc_info.get("nombre"):
                    doc_names.append(doc_info["nombre"])

        # Web Research
        research_context = await openai_service.research_topic(area, grados, tema)

        # 1. Generación
        result = await openai_service.generate_planeacion(
            area=area,
            grados=grados,
            tema=tema,
            duracion=duracion,
            recursos=recursos,
            docente_id=docente_id,
            skill_context=skill_context,
            reference_context=reference_context,
            rag_context=rag_context,
            research_context=research_context,
        )

        # 2. Revisión y auditoría pedagógica
        result = await openai_service.review_planeacion(
            planeacion_result=result,
            area=area,
            grados=grados,
            tema=tema,
        )

        saved_id = None
        try:
            # Inject reference materials info into contenido_generado
            if doc_names and isinstance(result.get("contenido_generado"), dict):
                result["contenido_generado"]["materiales_referenciados"] = doc_names

            insert_data = {
                "id": str(uuid.uuid4()),
                "docente_id": docente_id,
                "area": area,
                "grados": grados,
                "tema": tema,
                "contenido_generado": result["contenido_generado"],
                "dba_referenciados": result.get("dba_referenciados", []),
                "agente_usado": result.get("agente_usado", "EduAgent-AI"),
                "tokens_consumidos": result.get("tokens_consumidos", 0),
                "validada_docente": False,
                "correcciones": None,
            }
            saved = await supabase_service.create_planeacion(insert_data)
            saved_id = saved.get("id")

            # 3. Pre-generar taller/actividad descargable para el estudiante usando el material de referencia
            try:
                actividad_data = await openai_service.generate_actividad(
                    area=area,
                    grados=grados,
                    tema=tema,
                    contenido_generado=result["contenido_generado"],
                    skill_context=skill_context,
                    reference_context=reference_context,
                    research_context=research_context,
                )
                if saved_id and actividad_data:
                    await supabase_service.update_planeacion(saved_id, {"actividad_generada": actividad_data})
                    logger.info(f"Actividad pre-generada y adjuntada a planeación {saved_id}")
            except Exception as act_err:
                logger.warning(f"No se pudo pre-generar la actividad descargable: {act_err}")
        except Exception as save_err:
            logger.warning(f"No se pudo guardar la planeación: {save_err}")

        resumen = [
            f"✅ **Planeación y Actividad Impresa Generadas** — **{area}**, Grado(s) {', '.join(str(g) for g in grados)}",
            f"📚 **Tema**: {tema}",
            f"⏱️ **Duración**: {duracion} min",
        ]
        if doc_names:
            resumen.append(f"📄 **Materiales de Referencia**: {', '.join(doc_names)}")
        if saved_id:
            resumen.append(f"💾 **Guardada** con ID: `{saved_id}`")

        contenido = result.get("contenido_generado", {})
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


async def _exec_listar_evaluaciones(args: dict, docente_id: str) -> str:
    from app.services.supabase_service import supabase_service

    limite = args.get("limite", 10)
    solo_pendientes = args.get("solo_pendientes", False)

    try:
        evaluaciones = await supabase_service.get_evaluaciones(docente_id)
        if not evaluaciones:
            return "No tienes evaluaciones guardadas aún. Puedes subir una en la sección **Evaluación**."

        if solo_pendientes:
            evaluaciones = [
                e for e in evaluaciones
                if not e.get("procesado_correctamente") or e.get("nota") is None
            ]
            if not evaluaciones:
                return "🎉 ¡Todas tus evaluaciones están calificadas! No hay pendientes."

        evaluaciones = evaluaciones[:limite]
        lines = [f"📋 **{len(evaluaciones)} evaluación(es){'pendiente(s)' if solo_pendientes else ''}:**\n"]
        for i, e in enumerate(evaluaciones, 1):
            nombre = e.get("estudiante_nombre") or "Sin identificar"
            nota = e.get("nota")
            nota_str = f"**{float(nota):.1f}**/10" if nota is not None else "⏳ Sin nota"
            estado = ""
            if e.get("calificacion_manual"):
                estado = " 📝 Manual"
            elif e.get("procesado_correctamente"):
                estado = " 🤖 IA"
            elif e.get("error_ocr"):
                estado = " ⚠️ Error"
            else:
                estado = " ⏳ Procesando"

            lines.append(
                f"{i}. {nombre} — {e.get('area', '')} ({e.get('tipo', '')}) · "
                f"Nota: {nota_str}{estado} · ID: `{e['id'][:8]}…`"
            )

        lines.append("\nPara calificar manualmente, dime: *'Ponle un 8 a [nombre]'* o usa la sección **Evaluación**.")
        return "\n".join(lines)
    except Exception as e:
        logger.error(f"listar_evaluaciones error: {e}")
        return f"No pude obtener las evaluaciones en este momento: {str(e)}"


async def _exec_calificar_evaluacion(args: dict, docente_id: str) -> str:
    from app.services.supabase_service import supabase_service

    evaluacion_id = args.get("evaluacion_id", "")
    nota = args.get("nota")
    retroalimentacion = args.get("retroalimentacion")

    if nota is None:
        return "Necesito que me indiques la nota a asignar (de 0 a 10)."
    if nota < 0 or nota > 10:
        return "La nota debe estar entre 0 y 10."

    try:
        # Find evaluacion — try exact match first, then prefix match
        eval_data = await supabase_service.get_evaluacion(evaluacion_id)
        if not eval_data:
            # Try prefix match from recent evaluaciones
            evaluaciones = await supabase_service.get_evaluaciones(docente_id)
            matches = [e for e in evaluaciones if e["id"].startswith(evaluacion_id)]
            if len(matches) == 1:
                eval_data = matches[0]
                evaluacion_id = eval_data["id"]
            elif len(matches) > 1:
                return f"Encontré {len(matches)} evaluaciones con ese ID parcial. Por favor, sé más específico."
            else:
                return "No encontré esa evaluación. Usa `listar_evaluaciones` para ver los IDs disponibles."

        if eval_data["docente_id"] != docente_id:
            return "No tienes acceso a esa evaluación."

        update_dict = {
            "nota": nota,
            "calificacion_manual": True,
            "procesado_correctamente": True,
            "error_ocr": None,
        }
        if retroalimentacion:
            update_dict["retroalimentacion"] = retroalimentacion
        # Preserve IA grade
        if eval_data.get("nota") is not None and not eval_data.get("calificacion_manual"):
            update_dict["nota_ia"] = eval_data.get("nota")

        await supabase_service.update_evaluacion(evaluacion_id, update_dict)

        nombre = eval_data.get("estudiante_nombre") or "Estudiante"
        msg = f"✅ **Calificación guardada** — **{nombre}**: **{nota:.1f}**/10"
        if eval_data.get("nota") is not None and not eval_data.get("calificacion_manual"):
            msg += f" (IA había dado {float(eval_data['nota']):.1f})"
        if retroalimentacion:
            msg += f"\n💬 Retroalimentación: {retroalimentacion}"
        return msg
    except Exception as e:
        logger.error(f"calificar_evaluacion error: {e}")
        return f"No pude calificar la evaluación: {str(e)}"


async def _exec_generar_actividad(args: dict, docente_id: str) -> str:
    from app.services.openai_service import openai_service
    from app.services.supabase_service import supabase_service
    from app.routers.planeacion import _get_skill_context

    area = args.get("area", "")
    grados = args.get("grados", [])
    tema = args.get("tema", "")
    tipo_actividad = args.get("tipo_actividad")
    documento_ids = args.get("documento_ids") or []
    planeacion_id = args.get("planeacion_id")

    try:
        skill_context = _get_skill_context(area, tipo_actividad=tipo_actividad)

        # Reference context from uploaded documents
        reference_context = None
        if documento_ids:
            texts = await supabase_service.get_documentos_text_content(
                docente_id, documento_ids
            )
            reference_context = "\n\n".join(texts) if texts else None

        # Base planeación if provided
        contenido_generado = {}
        if planeacion_id:
            plan = await supabase_service.get_planeacion(planeacion_id)
            if plan:
                contenido_generado = plan.get("contenido_generado", {})

        # Research context
        research_context = await openai_service.research_topic(area, grados, tema)

        actividad_data = await openai_service.generate_actividad(
            area=area,
            grados=grados,
            tema=tema,
            contenido_generado=contenido_generado,
            tipo_actividad=tipo_actividad,
            skill_context=skill_context,
            reference_context=reference_context,
            research_context=research_context,
        )

        if planeacion_id:
            await supabase_service.update_planeacion(planeacion_id, {"actividad_generada": actividad_data})

        titulo = actividad_data.get("titulo", "Taller Práctico")
        return (
            f"✅ **Taller/Actividad Impresa Generada Exitosamente**\n"
            f"📌 **Título**: {titulo}\n"
            f"📚 **Área y Grados**: {area} (Grado(s) {', '.join(str(g) for g in grados)})\n"
            f"📝 **Contenido**: Taller pedagógicamente estructurado y diferenciado por grado, con lecturas, casillas de opción múltiple, tablas de V/F, espacios de respuesta ([LINEAS]) e instrucciones para el estudiante.\n\n"
            f"Puedes verla, descargarla o imprimirla en PDF ingresando al módulo de **Planeaciones**."
        )
    except Exception as e:
        logger.error(f"generar_actividad error: {e}")
        return f"No pude generar la actividad en este momento: {str(e)}"


# ─── Dispatcher ───────────────────────────────────────────────────────────────

async def execute_tool(
    name: str,
    arguments: dict,
    docente_id: str,
    session_id: str | None = None,
) -> str:
    """Dispatch a tool call to its executor and return a string result."""
    dispatch = {
        "buscar_en_internet": lambda a: _exec_buscar_en_internet(a, docente_id, session_id),
        "consultar_documentos": lambda a: _exec_consultar_documentos(a, docente_id, session_id),
        "generar_planeacion": lambda a: _exec_generar_planeacion(a, docente_id),
        "generar_actividad": lambda a: _exec_generar_actividad(a, docente_id),
        "listar_planeaciones": lambda a: _exec_listar_planeaciones(a, docente_id),
        "listar_estudiantes": lambda a: _exec_listar_estudiantes(a, docente_id),
        "ver_estadisticas": lambda a: _exec_ver_estadisticas(a, docente_id),
        "listar_evaluaciones": lambda a: _exec_listar_evaluaciones(a, docente_id),
        "calificar_evaluacion": lambda a: _exec_calificar_evaluacion(a, docente_id),
    }
    executor = dispatch.get(name)
    if not executor:
        return f"Herramienta desconocida: {name}"
    return await executor(arguments)

