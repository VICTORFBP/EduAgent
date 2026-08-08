"""EduAgent — OpenAI Service: Centralized LLM calls.

Replaces all n8n AI workflows with direct OpenAI API calls.
- Planeación Curricular (RAG)
- Generación de Actividad
- Verificación de Actividad
- Evaluación Híbrida (Vision)
- Consulta RAG
"""

import json
import re
import logging
import base64
from typing import Optional

import httpx
from openai import AsyncOpenAI

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def _fix_invalid_json_escapes(json_str: str) -> str:
    """Fix invalid escape sequences in JSON strings."""
    return re.sub(r'\\(?!["\\/bfnrtu])', r'\\\\', json_str)


def _extract_json(raw: str) -> dict:
    """Extract JSON object from LLM response, stripping markdown fences."""
    cleaned = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.IGNORECASE)
    cleaned = re.sub(r'```\s*$', '', cleaned, flags=re.IGNORECASE).strip()

    # Find the first { and last }
    first = cleaned.find('{')
    last = cleaned.rfind('}')
    if first != -1 and last != -1:
        cleaned = cleaned[first:last + 1]

    # Fix LaTeX-style escapes
    cleaned = cleaned.replace('\\(', '$').replace('\\)', '$')
    cleaned = cleaned.replace('\\[', '$$').replace('\\]', '$$')

    return json.loads(_fix_invalid_json_escapes(cleaned))


class OpenAIService:
    """Centralized OpenAI API client for all LLM operations."""

    def __init__(self):
        self._client: AsyncOpenAI | None = None

    @property
    def client(self) -> AsyncOpenAI:
        if self._client is None:
            self._client = AsyncOpenAI(api_key=settings.openai_api_key)
        return self._client

    # ─── Investigación con Web Search ─────────────────────────────────────────

    async def research_topic(self, area: str, grados: list[int], tema: str) -> str:
        """
        Investiga un tema pedagógico usando la herramienta de búsqueda web (OpenAI Web Search).
        Retorna un resumen conceptual preciso para guiar la generación de la planeación y actividad.
        """
        if not settings.enable_web_research:
            return ""

        prompt = (
            f"Investiga y sintetiza conceptos pedagógicos clave para la enseñanza del tema '{tema}' "
            f"en el área de '{area}' para educación primaria (Grados: {', '.join(str(g) for g in grados)}).\n\n"
            "Incluye:\n"
            "1. Definición rigurosa y correcta del tema (evitando confusiones conceptuales comunes).\n"
            "2. Ejemplos representativos y adecuados para educación primaria.\n"
            "3. Errores o confusiones frecuentes que deben evitarse en las actividades.\n"
            "Responde de forma concisa y directa en 2-3 párrafos."
        )

        # Intento con la Responses API
        try:
            if hasattr(self.client, "responses"):
                response = await self.client.responses.create(
                    model=settings.openai_generation_model,
                    tools=[{"type": "web_search"}],
                    input=prompt,
                )
                if hasattr(response, "output_text") and response.output_text:
                    logger.info(f"Web research completada vía Responses API para tema '{tema}'")
                    return response.output_text
        except Exception as e:
            logger.warning(f"Responses API web_search no disponible o falló: {e}")

        # Fallback a Chat Completions
        try:
            response = await self.client.chat.completions.create(
                model=settings.openai_generation_model,
                messages=[
                    {
                        "role": "system",
                        "content": "Eres un asistente de investigación pedagógica especializado en educación primaria en Colombia."
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.2,
                max_tokens=800,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.warning(f"Fallback research_topic falló: {e}")
            return ""

    # ─── Planeación Curricular ────────────────────────────────────────────────

    async def generate_planeacion(
        self,
        area: str,
        grados: list[int],
        tema: str,
        duracion: int,
        recursos: str,
        docente_id: str,
        feedback: str | None = None,
        contenido_anterior: dict | None = None,
        tipo_actividad: str | None = None,
        skill_context: str | None = None,
        reference_context: str | None = None,
        rag_context: str | None = None,
        research_context: str | None = None,
    ) -> dict:
        """
        Generate a planeación curricular using OpenAI with RAG and Research context.
        Replaces n8n's "EduAgent - Planeación Curricular (RAG)" workflow.
        """
        system_prompt = (
            "Eres un experto pedagógico de la Escuela Rural Mixta El Crucero, "
            "especializado en el modelo Escuela Nueva. Tu tarea es generar o refinar "
            "una planeación curricular para un aula multigrado.\n\n"
            "Si se te pide refinar una planeación anterior según la retroalimentación "
            "del docente, mantén la estructura general y el contenido que sea correcto, "
            "pero modifica, corrige o amplía las secciones necesarias para atender "
            "puntualmente la retroalimentación provista por el docente.\n\n"
            "Si el docente proporcionó instrucciones específicas sobre el tipo de actividad, "
            "DEBES seguirlas al pie de la letra (ejemplo: cantidad de ejercicios, espacios "
            "en blanco, tipo de preguntas, etc).\n\n"
            "Si se incluyen instrucciones de formato para el área, aplícalas solo a la "
            "planeación (texto/Markdown en actividades). NO uses HTML ni clases taller-* "
            "en este JSON; el HTML es solo para el flujo de taller/actividad evaluativa.\n\n"
            "La planeación debe estar estrictamente en formato JSON y contener:\n"
            "1. objetivo: Un objetivo de aprendizaje claro.\n"
            "2. dba_citado: El texto del DBA que se está trabajando.\n"
            "3. indicadores: Una lista de objetos {grado: number, indicador: string} con "
            "indicadores específicos por grado.\n"
            "4. actividades: Un objeto con {apertura: string, desarrollo: string, cierre: string}.\n"
            "5. diferenciacion: Estrategias para manejar los diferentes niveles en el aula multigrado.\n"
            "6. criterios_evaluacion: Cómo se medirá el éxito.\n"
            "7. estandar_men: El estándar del MEN que fundamenta la planeación.\n\n"
            "Para fórmulas usa $...$ en strings JSON. Evita comandos LaTeX con backslash "
            "(\\sqrt, \\frac); prefiere notación legible: sqrt(36), 2^3, log_2(8). "
            "Nunca \\( \\) ni HTML en actividades.\n"
            "Asegúrate de que las actividades sean prácticas, conceptualmente rigurosas y adecuadas para un contexto rural.\n"
            "Responde ÚNICAMENTE con el objeto JSON, sin bloques de código markdown."
        )

        # Build the user prompt
        if feedback and contenido_anterior:
            user_prompt = (
                "Refina la planeación curricular anterior basándose en los comentarios del docente.\n\n"
                f"Planeación anterior:\n{json.dumps(contenido_anterior, ensure_ascii=False)}\n\n"
                f"Comentarios del docente (feedback):\n{feedback}"
            )
        else:
            user_prompt = (
                f"Genera una planeación para el área de {area}, "
                f"grados {', '.join(str(g) for g in grados)}, "
                f"tema: {tema}. Duración: {duracion} horas. Recursos: {recursos}."
            )

        if tipo_actividad:
            user_prompt += f"\n\nInstrucciones específicas del docente:\n{tipo_actividad}"

        if research_context:
            user_prompt += (
                f"\n\n--- Investigación conceptual previa sobre el tema ---\n"
                f"{research_context}"
            )

        if skill_context:
            user_prompt += f"\n\nInstrucciones de formato para esta área:\n{skill_context}"

        if rag_context:
            user_prompt += (
                f"\n\n--- Contexto de documentos curriculares (DBA, Estándares MEN) ---\n"
                f"{rag_context}"
            )

        if reference_context:
            user_prompt += (
                f"\n\n--- Material de referencia del docente ---\n"
                f"{reference_context}"
            )

        response = await self.client.chat.completions.create(
            model=settings.openai_generation_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=4000,
        )

        raw_output = response.choices[0].message.content or ""
        contenido = _extract_json(raw_output)

        return {
            "contenido_generado": contenido,
            "dba_referenciados": [contenido.get("dba_citado")] if contenido.get("dba_citado") else [],
            "docente_id": docente_id,
            "area": area,
            "grados": grados,
            "tema": tema,
            "tipo_actividad": tipo_actividad,
            "agente_usado": f"OpenAI {settings.openai_generation_model}",
            "tokens_consumidos": response.usage.total_tokens if response.usage else 0,
        }

    async def review_planeacion(
        self,
        planeacion_result: dict,
        area: str,
        grados: list[int],
        tema: str,
    ) -> dict:
        """
        Revisa y audita pedagógicamente una planeación generada antes de guardarla/presentarla.
        Garantiza la exactitud conceptual y la coherencia del diseño curricular.
        """
        contenido = planeacion_result.get("contenido_generado", {})
        if not contenido or not isinstance(contenido, dict):
            return planeacion_result

        system_prompt = (
            "Eres un auditor pedagógico senior en Colombia, especializado en educación primaria y Escuela Nueva.\n"
            "Tu tarea es REVISAR Y CORREGIR la planeación curricular en JSON generada por IA.\n\n"
            "CRITERIOS DE REVISIÓN Y AUDITORÍA:\n"
            "1. PRECISIÓN CONCEPTUAL DEL TEMA: Comprueba que el tema principal no haya sido confundido con otro concepto. "
            "Por ejemplo, 'Contracciones gramaticales' debe tratar estrictamente sobre las contracciones 'al' y 'del', sin desviarse a conjugación verbal.\n"
            "2. COHERENCIA INTERNA: El objetivo de aprendizaje, las actividades (apertura, desarrollo, cierre) y la evaluación deben corresponder exactamente entre sí.\n"
            "3. PRESERVACIÓN DEL FORMATO JSON: La respuesta DEBE mantener la misma estructura JSON con las claves: "
            "`objetivo`, `dba_citado`, `indicadores`, `actividades`, `diferenciacion`, `criterios_evaluacion`, `estandar_men`.\n\n"
            "Si encuentras inconsistencias o desaciertos pedagógicos, CORRÍGELOS DIRECTAMENTE en el JSON.\n"
            "Responde ÚNICAMENTE con el objeto JSON final corregido, sin bloques de código markdown."
        )

        user_prompt = (
            f"Área: {area}\n"
            f"Grados: {', '.join(str(g) for g in grados)}\n"
            f"Tema solicitado: {tema}\n\n"
            f"Planeación generada a auditar:\n"
            f"{json.dumps(contenido, ensure_ascii=False)}"
        )

        try:
            response = await self.client.chat.completions.create(
                model=settings.openai_review_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                max_tokens=4000,
            )
            raw_output = response.choices[0].message.content or ""
            reviewed_contenido = _extract_json(raw_output)
            if isinstance(reviewed_contenido, dict) and "actividades" in reviewed_contenido:
                planeacion_result["contenido_generado"] = reviewed_contenido
                if reviewed_contenido.get("dba_citado"):
                    planeacion_result["dba_referenciados"] = [reviewed_contenido["dba_citado"]]
                logger.info(f"Review de planeación completada exitosamente para tema '{tema}'")
        except Exception as e:
            logger.warning(f"Error en review_planeacion, conservando versión original: {e}")

        return planeacion_result

    # ─── Generación de Actividad ──────────────────────────────────────────────

    async def generate_actividad(
        self,
        area: str,
        grados: list[int],
        tema: str,
        contenido_generado: dict,
        tipo_actividad: str | None = None,
        skill_context: str | None = None,
        reference_context: str | None = None,
        research_context: str | None = None,
    ) -> dict:
        """
        Generate an activity/worksheet from a planeación.
        Replaces n8n's "EduAgent - Generación de Actividad (AI)" workflow.
        """
        grados_str = ", ".join(str(g) for g in grados)
        system_prompt = (
            "Eres un experto pedagógico y creador de material didáctico para la Escuela Rural Mixta El Crucero "
            "(modelo Escuela Nueva de Colombia). Tu objetivo es diseñar actividades evaluativas y talleres "
            "visuales, dinámicos, creativos y pedagógicamente rigurosos que NO parezcan plantillas genéricas.\n\n"
            "🚨 REGLA DE ORO — MATERIAL DE REFERENCIA / ARCHIVOS ADJUNTOS:\n"
            "Si se proporciona 'Material de referencia del docente' (texto o imagen extraída de un taller, guía, libro o libreta), "
            "DEBES EXTRAER Y ADAPTAR DIRECTAMENTE LOS EJERCICIOS, PREGUNTAS, DIAGRAMAS Y CASOS DE LECTURA PRESENTES EN ESE MATERIAL. "
            "No crees preguntas abstractas o genéricas cuando tengas un archivo adjunto: toma sus problemas reales, "
            "sus lecturas o sus enunciados y transfórmalos en una guía impresa estructurada y diferenciada por grado.\n\n"
            "🚨 REGLA DE ORO — PRECISIÓN CONCEPTUAL Y TEMÁTICA:\n"
            "Cada uno de los ejercicios formulados DEBE ser conceptualmente correcto y alinearse ESTRICTAMENTE con el tema de la clase.\n"
            "Ejemplo: Si el tema es 'Contracciones gramaticales', los ejercicios deben tratar EXCLUSIVAMENTE sobre las contracciones ('al', 'del') "
            "y NO sobre verbos (soy/eres/tiene) u otros conceptos desacertados.\n\n"
            "🚨 REGLA DE ORO — PRIORIDAD ABSOLUTA DEL DOCENTE (tipo_actividad):\n"
            "Si se te proporcionan instrucciones específicas del docente (tipo_actividad), DEBES CUMPLIRLAS AL 100% DE FORMA OBLIGATORIA. "
            "Por ejemplo:\n"
            "- Si solicita un texto o lectura extensa ('2 páginas de lectura', 'historia larga', etc.), escribe un relato completo, narrativamente detallado, de varios párrafos dentro del bloque `> 📖 FRAGMENTO` (no hagas un resumen breve de un solo párrafo).\n"
            "- Si solicita secciones específicas ('comprensión lectora', 'verdadero/falso', 'selección múltiple', 'espacio para dibujar', etc.), INCLÚYELAS TODAS obligatoriamente.\n"
            "- Si solicita un tema o leyenda específica (ej. 'La leyenda del duende'), enfoca todo el contenido en esa temática.\n\n"
            "REGLAS DE ESTRUCTURA Y FORMATO:\n"
            "Responde ÚNICAMENTE con un objeto JSON conteniendo las claves `contenido_grados` y `clave_respuestas` SOLO para los grados solicitados: " + grados_str + ".\n"
            "Formato JSON exacto:\n"
            "{\n"
            '  "titulo": "Título atractivo y contextualizado",\n'
            f'  "area": "{area}",\n'
            f'  "tema": "{tema}",\n'
            '  "instrucciones": "Instrucciones claras para el estudiante",\n'
            '  "contenido_grados": {\n'
            f'    "{grados[0]}": "Cadena de texto Markdown completa para grado {grados[0]}..."\n'
            '  },\n'
            '  "clave_respuestas": {\n'
            f'    "{grados[0]}": "Solucionario detallado para el docente..."\n'
            '  }\n'
            "}\n\n"
            "CRÍTICO SOBRE `contenido_grados`:\n"
            "1. Cada clave de grado DEBE ser una CADENA DE TEXTO MARKDOWN COMPLETA. NO uses objetos anidados como {\"preguntas\": [...]}.\n"
            "2. Genera contenido ÚNICAMENTE para los grados indicados en la solicitud (" + grados_str + "). NO generes otros grados.\n"
            "3. LONGITUD Y DENSIDAD: Genera una actividad rica y completa de entre 8 y 12 ítems o ejercicios distribuidos en secciones temáticas (1.5 a 2 páginas por grado).\n"
            "4. ESPACIOS DE RESPUESTA: Toda pregunta abierta DEBE llevar `[LINEAS:4]` o `[LINEAS:5]` o `> 🎨 DIBUJO`.\n"
            "5. COMPONENTES VISUALES: Usa `> 📖 FRAGMENTO`, `> 📦 RECUADRO`, `> 🎨 DIBUJO`, `> 📦 GRILLA`, `> 📋 RELACION`, `> 🧩 COMPLETAR`, `> 📝 ORDENAR`, `> ✏️ CORREGIR`, `> 🔢 ESCALA`, `[LINEAS:N]`, `A. [ ]`, `| Afirmación | V | F |<SALTO>`.\n"
            "6. NO incluyas soluciones en `contenido_grados`; las respuestas van EXCLUSIVAMENTE en `clave_respuestas`.\n"
            "7. En tablas Markdown (`|...|`), separa filas con `<SALTO>`. Toda notación matemática DEBE usar `$expresión$` o `$$expresión$$`.\n"
            "Responde ÚNICAMENTE con el objeto JSON, sin bloques de código markdown extra."
        )

        user_prompt_parts = [
            f"Área: {area}",
            f"Grados a generar: {grados_str}",
            f"Tema: {tema}",
        ]

        if research_context:
            user_prompt_parts.append(
                f"--- Investigación conceptual previa sobre el tema ---\n{research_context}"
            )

        if tipo_actividad:
            user_prompt_parts.append(
                f"🚨🚨 INSTRUCCIONES ESPECÍFICAS Y REQUISITOS OBLIGATORIOS DEL DOCENTE:\n"
                f"{tipo_actividad}\n"
                f"(RECUERDA CUMPLIR TODAS ESTAS INSTRUCCIONES AL PIE DE LA LETRA: Si pide lectura de 2 páginas, genera un texto extenso y detallado; si pide secciones de dibujo, V/F, selección múltiple o comprensión lectora, inclúyelas TODAS)."
            )

        user_prompt_parts.append(
            f"Planeación base:\n{json.dumps(contenido_generado, ensure_ascii=False)}"
        )

        if reference_context:
            user_prompt_parts.append(f"Material de referencia del docente:\n{reference_context}")

        if skill_context:
            user_prompt_parts.append(f"Guía de componentes e instrucciones de formato:\n{skill_context}")

        user_prompt = "\n\n".join(user_prompt_parts)

        response = await self.client.chat.completions.create(
            model=settings.openai_generation_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.5,
            max_tokens=4000,
        )

        raw_output = response.choices[0].message.content or ""
        return _extract_json(raw_output)

    # ─── Verificación y Revisión de Actividad ──────────────────────────────────

    async def verify_actividad(
        self,
        actividad: dict,
        tipo_actividad: str | None = None,
        area: str | None = None,
        tema: str | None = None,
    ) -> dict:
        """
        Audita y corrige una actividad evaluativa/taller.
        Efectúa revisión técnica de sintaxis y revisión de calidad/exactitud conceptual.
        """
        system_prompt = (
            "Eres un auditor pedagógico senior y especialista en control de calidad técnica para EduAgent.\n"
            "Tu tarea es REVISAR Y CORREGIR rigurosamente el JSON de la actividad evaluativa/taller antes de entregarlo al docente.\n\n"
            "CRITERIOS OBLIGATORIOS DE AUDITORÍA Y CORRECCIÓN:\n\n"
            "1. PRECISIÓN CONCEPTUAL DEL TEMA:\n"
            "   - Revisa CADA ejercicio en `contenido_grados`. Todos los ejercicios deben corresponder ESTRICTAMENTE al tema de la clase.\n"
            "   - Ejemplo: Si el tema es 'Contracciones gramaticales', los ejercicios deben tratar sobre las contracciones en español ('al' = a + el, 'del' = de + el). Queda TOTALMENTE PROHIBIDO incluir ejercicios de conjugación verbal (soy/eres/tiene) u otros temas no relacionados.\n"
            "   - Si un ejercicio es conceptualmente erróneo o irrelevante, REEMPLÁZALO por uno correcto y bien formulado sobre el tema.\n\n"
            "2. CALIDAD DE PREGUNTAS Y OPCIONES:\n"
            "   - En preguntas de selección múltiple (A, B, C, D), asegúrate de que TODAS las opciones tengan sentido y sean plausibles. Elimina opciones absurdas como '[ ] No puedo', 'Opción D', etc.\n"
            "   - En ejercicios de completar (____), asegúrate de que las opciones sugeridas entre paréntesis sean distintas y correctas (ej. '(al / a el)', no '(soy/soy)').\n"
            "   - Evita ejercicios redundantes o sin instrucciones claras.\n\n"
            "3. ESTRUCTURA Y FORMATO TÉCNICO:\n"
            "   - `contenido_grados` debe mapear cada grado ('1', '2', '3', etc.) a una CADENA DE MARKDOWN COMPLETA. NO uses diccionarios u objetos anidados.\n"
            "   - Respeta las instrucciones del docente (si pide textos largos o secciones específicas).\n"
            "   - Verifica la sintaxis de componentes visuales (`> 📖 FRAGMENTO`, `> 📦 GRILLA`, `[LINEAS:N]`, `> 🎨 DIBUJO`, `> 📋 RELACION`, etc.).\n"
            "   - Asegúrate de que las soluciones estén EXCLUSIVAMENTE en `clave_respuestas` y NUNCA en `contenido_grados`.\n"
            "   - En tablas Markdown `|...|`, separa filas con `<SALTO>`.\n"
            "   - Toda notación matemática DEBE usar $...$ o $$...$$.\n\n"
            "Devuelve ÚNICAMENTE el objeto JSON corregido, sin bloques de código markdown."
        )

        user_content_parts = [json.dumps(actividad, ensure_ascii=False)]
        if area:
            user_content_parts.append(f"Área: {area}")
        if tema:
            user_content_parts.append(f"Tema de la clase: {tema}")
        if tipo_actividad:
            user_content_parts.append(f"Instrucciones del docente:\n{tipo_actividad}")

        user_content = "\n\n".join(user_content_parts)

        try:
            response = await self.client.chat.completions.create(
                model=settings.openai_review_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.1,
                max_tokens=4000,
            )

            raw_output = response.choices[0].message.content or ""
            reviewed = _extract_json(raw_output)
            if isinstance(reviewed, dict) and "contenido_grados" in reviewed:
                logger.info("Auditoría y verificación de actividad completada exitosamente")
                return reviewed
            return actividad
        except (json.JSONDecodeError, ValueError, Exception) as e:
            logger.warning(f"Verification/Review returned invalid JSON, keeping original: {e}")
            return actividad

    async def review_actividad(
        self,
        actividad: dict,
        tipo_actividad: str | None = None,
        area: str | None = None,
        tema: str | None = None,
    ) -> dict:
        """Alias de verify_actividad."""
        return await self.verify_actividad(actividad, tipo_actividad=tipo_actividad, area=area, tema=tema)

    # ─── Evaluación con Vision (OCR y Calificación Inteligente) ───────────────

    async def evaluate_with_vision(
        self,
        image_data: bytes | str,
        content_type: str,
        tipo: str,
        is_url: bool = False,
    ) -> dict:
        """
        Extrae respuestas del estudiante y datos visuales de una imagen/PDF usando GPT-4o Vision.
        """
        if tipo == "estandarizada":
            ocr_prompt = (
                "Eres un evaluador y escáner óptico (OCR) docente de alta precisión.\n"
                "Esta es la Hoja de Respuestas o prueba de un estudiante de educación primaria.\n"
                "Tu tarea es:\n"
                "1. Extraer el nombre del estudiante si está escrito en el encabezado.\n"
                "2. Leer fielmente las opciones marcadas (A, B, C, D) para cada número de pregunta.\n\n"
                "Retorna ÚNICAMENTE un JSON válido con este formato:\n"
                "{\n"
                '  "nombre_estudiante": "Nombre del estudiante si aparece escrito, sino null",\n'
                '  "respuestas": [\n'
                "    {\n"
                '      "numero": "1",\n'
                '      "opcion_marcada": "C",\n'
                '      "descripcion_del_garabato_negro": "Marcó la opción C"\n'
                "    }\n"
                "  ]\n"
                "}\n"
            )
        else:
            ocr_prompt = (
                "Eres un evaluador y transcriptor pedagógico de alta precisión para educación primaria.\n"
                "En este documento hay respuestas manuscritas de un estudiante (procedimientos en lápiz/lapicero, "
                "dibujos, textos, tablas o tachones en una guía o cuaderno).\n"
                "Tu tarea es:\n"
                "1. Extraer el nombre del estudiante si está escrito.\n"
                "2. Transcribir de forma fiel y ordenada cada respuesta, procedimiento o cálculo que el estudiante escribió para cada pregunta o sección.\n"
                "3. Indicar si alguna pregunta quedó en blanco o ilegible.\n\n"
                "Retorna ÚNICAMENTE un JSON válido con este formato:\n"
                "{\n"
                '  "nombre_estudiante": "Nombre detectado o null",\n'
                '  "respuestas_transcritas": [\n'
                "    {\n"
                '      "pregunta_num": "1",\n'
                '      "respuesta_estudiante": "Texto o cálculo escrito a mano por el alumno...",\n'
                '      "estado": "respondida | en_blanco | ilegible"\n'
                "    }\n"
                "  ]\n"
                "}\n"
            )

        content: list[dict] = [{"type": "text", "text": ocr_prompt}]

        if is_url:
            content.append({
                "type": "image_url",
                "image_url": {"url": image_data, "detail": "high"},
            })
        else:
            b64 = base64.b64encode(image_data).decode("utf-8")
            content.append({
                "type": "image_url",
                "image_url": {"url": f"data:{content_type};base64,{b64}", "detail": "high"},
            })

        response = await self.client.chat.completions.create(
            model=settings.openai_vision_model,
            messages=[{"role": "user", "content": content}],
            temperature=0,
            max_tokens=2000,
        )

        raw = response.choices[0].message.content or ""
        data = _extract_json(raw)

        if data.get("respuestas") and isinstance(data["respuestas"], list):
            respuestas_dict = {}
            for item in data["respuestas"]:
                respuestas_dict[str(item.get("numero", ""))] = item.get("opcion_marcada", "")
            data["respuestas_estudiante"] = respuestas_dict
            data["raw_vision"] = data["respuestas"]

        return data

    async def evaluate_grade(
        self,
        vision_data: dict,
        area: str,
        tipo: str,
        contexto_evaluacion: dict | None = None,
        estudiantes_lote: list[dict] | None = None,
        image_url: str | None = None,
    ) -> dict:
        """
        Califica la evaluación del estudiante comparando los datos visuales/manuscritos
        directamente contra el Solucionario Docente (clave_respuestas) y los criterios de evaluación.
        Retorna la nota calculada (0.0 a 10.0) y una retroalimentación pedagógica motivadora y detallada.
        """
        user_prompt = (
            f"Eres un evaluador pedagógico experto de la Institución Educativa El Crucero.\n"
            f"Área: {area}\n"
            f"Tipo de evaluación: {tipo}\n\n"
            f"--- SOLUCIONARIO DOCENTE Y CONTEXTO DE LA ACTIVIDAD ---\n"
            f"{json.dumps(contexto_evaluacion, ensure_ascii=False, indent=2) if contexto_evaluacion else 'No disponible'}\n\n"
            f"--- DATOS EXTRAÍDOS DE LA ENTREGA DEL ESTUDIANTE ---\n"
            f"{json.dumps(vision_data, ensure_ascii=False, indent=2)}\n\n"
        )

        if estudiantes_lote:
            user_prompt += (
                f"--- LISTA DE ESTUDIANTES REGISTRADOS EN EL CURSO ---\n"
                f"{json.dumps(estudiantes_lote, ensure_ascii=False)}\n\n"
                "Identifica a qué estudiante pertenece esta evaluación comparando el 'nombre_estudiante' detectado "
                "con la lista oficial y devuelve su 'estudiante_id'. Si no coincide con ninguno con certeza, devuelve null.\n\n"
            )

        user_prompt += (
            "CRITERIOS DE CALIFICACIÓN Y RÚBRICA:\n"
            "1. Si es PRUEBA ESTANDARIZADA (selección múltiple):\n"
            "   - Compara cada respuesta del alumno con la 'clave_respuestas' del solucionario.\n"
            "   - Calcula total de aciertos sobre total de preguntas.\n"
            "   - Asigna nota de 1.0 a 10.0: Nota = 1.0 + (Aciertos / Total_Preguntas) * 9.0 (redondeada a 1 decimal).\n"
            "   - En la retroalimentación, destaca cuántas preguntas acertó y explica de forma pedagógica y constructiva "
            "los puntos donde falló (ej. 'En la pregunta 3 marcaste B, pero la respuesta correcta es C porque...').\n\n"
            "2. Si es ACTIVIDAD ABIERTA / CUADERNO MANUSCRITO:\n"
            "   - Evalúa procedimientos, coherencia, comprensión lectora, cálculos y esfuerzo pedagógico.\n"
            "   - Califica en escala de 0.0 a 10.0 (considera aciertos parciales si el procedimiento matemático o la idea es correcta).\n"
            "   - Estructura la retroalimentación en 3 partes claras:\n"
            "     • 🌟 Aciertos y fortalezas demostradas.\n"
            "     • 🔍 Preguntas o ejercicios a corregir/reforzar con su respectiva justificación.\n"
            "     • 💡 Sugerencia motivadora para la próxima clase.\n\n"
            "Retorna ÚNICAMENTE un JSON válido con esta estructura:\n"
            "{\n"
            '  "nota": 8.5,\n'
            '  "retroalimentacion": "🌟 ¡Buen trabajo! Tuviste 4 de 5 respuestas correctas...\\n🔍 En el punto 3: ...\\n💡 Recomendación: ...",\n'
            '  "estudiante_id": "uuid-si-aplica-o-null"\n'
            "}"
        )

        response = await self.client.chat.completions.create(
            model=settings.openai_vision_model,
            messages=[{"role": "user", "content": user_prompt}],
            temperature=0.1,
            max_tokens=1500,
        )

        raw = response.choices[0].message.content or ""
        return _extract_json(raw)

    # ─── Consulta RAG Chat ────────────────────────────────────────────────────

    async def chat_rag(
        self,
        pregunta: str,
        rag_context: str,
    ) -> str:
        """
        Answer a question using RAG context from documents.
        Replaces n8n's "EduAgent RAG Tool Based" workflow.
        """
        system_prompt = (
            "Eres EduAgent, un asistente pedagógico experto y amable diseñado para "
            "ayudar a los docentes.\n\n"
            "Tus principales directrices son:\n"
            "1. Responde de forma clara, didáctica y estructurada.\n"
            "2. Basa tu respuesta en el contexto de documentos proporcionado.\n"
            "3. Si la información no está en los documentos, indícalo amablemente.\n"
            "4. Mantén un tono motivador y empático.\n"
            "5. No inventes información ni alucines datos."
        )

        user_prompt = f"Pregunta: {pregunta}"
        if rag_context:
            user_prompt += (
                f"\n\n--- Contexto recuperado de documentos pedagógicos ---\n"
                f"{rag_context}"
            )

        response = await self.client.chat.completions.create(
            model=settings.openai_generation_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=2000,
        )

        return response.choices[0].message.content or ""


# Singleton
openai_service = OpenAIService()
