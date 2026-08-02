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
    ) -> dict:
        """
        Generate a planeación curricular using OpenAI with RAG context.
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
            "Asegúrate de que las actividades sean prácticas y adecuadas para un contexto rural.\n"
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
    ) -> dict:
        """
        Generate an activity/worksheet from a planeación.
        Replaces n8n's "EduAgent - Generación de Actividad (AI)" workflow.
        """
        system_prompt = (
            "Eres un generador de actividades evaluativas para la Escuela Rural Mixta El Crucero. "
            "A partir de una planeación curricular, genera una actividad evaluativa completa.\n\n"
            "La actividad debe tener la siguiente estructura JSON:\n"
            "{\n"
            '  "titulo": "Título descriptivo de la actividad",\n'
            '  "area": "Área",\n'
            '  "tema": "Tema",\n'
            '  "contenido_grados": {\n'
            '    "3": {\n'
            '      "instrucciones": "Instrucciones para este grado",\n'
            '      "preguntas": [...],\n'
            '      "clave_respuestas": {...}\n'
            "    }\n"
            "  }\n"
            "}\n\n"
            "Responde ÚNICAMENTE con el objeto JSON, sin bloques de código markdown."
        )

        user_prompt = (
            f"Área: {area}\n"
            f"Grados: {', '.join(str(g) for g in grados)}\n"
            f"Tema: {tema}\n\n"
            f"Planeación base:\n{json.dumps(contenido_generado, ensure_ascii=False)}"
        )

        if tipo_actividad:
            user_prompt += f"\n\nTipo de actividad solicitado: {tipo_actividad}"

        if skill_context:
            user_prompt += f"\n\nInstrucciones de formato:\n{skill_context}"

        if reference_context:
            user_prompt += f"\n\nMaterial de referencia del docente:\n{reference_context}"

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
        return _extract_json(raw_output)

    # ─── Verificación de Actividad ────────────────────────────────────────────

    async def verify_actividad(self, actividad: dict) -> dict:
        """
        Verify and potentially correct an activity.
        Replaces n8n's activity verification webhook.
        """
        system_prompt = (
            "Eres un verificador de actividades evaluativas. Revisa la actividad y "
            "corrige cualquier error en:\n"
            "- Formato JSON\n"
            "- Coherencia de las preguntas con el tema y grado\n"
            "- Claves de respuestas correctas\n"
            "- Instrucciones claras\n\n"
            "Si la actividad está correcta, devuélvela tal como está.\n"
            "Si hay errores, corrígelos y devuelve la versión corregida.\n"
            "Responde ÚNICAMENTE con el objeto JSON corregido."
        )

        response = await self.client.chat.completions.create(
            model=settings.openai_generation_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(actividad, ensure_ascii=False)},
            ],
            temperature=0.1,
            max_tokens=4000,
        )

        raw_output = response.choices[0].message.content or ""
        try:
            return _extract_json(raw_output)
        except (json.JSONDecodeError, ValueError):
            logger.warning("Verification returned invalid JSON, keeping original")
            return actividad

    # ─── Evaluación con Vision (OCR) ──────────────────────────────────────────

    async def evaluate_with_vision(
        self,
        image_data: bytes | str,
        content_type: str,
        tipo: str,
        is_url: bool = False,
    ) -> dict:
        """
        Extract student answers from an evaluation image/PDF using GPT-4o Vision.
        Replaces n8n's Gemini Vision OCR step.

        Args:
            image_data: file bytes or URL string
            content_type: MIME type of the file
            tipo: 'estandarizada' or 'abierta'
            is_url: if True, image_data is a URL string
        """
        if tipo == "estandarizada":
            ocr_prompt = (
                "Eres un escáner óptico (OCR) muy estricto.\n"
                "Esta es la Hoja de Respuestas de una prueba estandarizada de un estudiante.\n"
                "Tu trabajo es extraer el nombre del estudiante y leer EXCLUSIVAMENTE los "
                "círculos (A, B, C, D) que el estudiante ha marcado con lápiz/tinta para cada número.\n\n"
                "Retorna ÚNICAMENTE un JSON válido con este formato:\n"
                "{\n"
                '  "nombre_estudiante": "Nombre del estudiante si aparece escrito, sino null",\n'
                '  "respuestas": [\n'
                "    {\n"
                '      "numero": "1",\n'
                '      "opcion_marcada": "C",\n'
                '      "descripcion_del_garabato_negro": "El círculo C tiene un rayón negro."\n'
                "    }\n"
                "  ]\n"
                "}\n"
                "NO evalúes nada. Solo reporta el nombre y lo que rayó a mano."
            )
        else:
            ocr_prompt = (
                "Eres un escáner óptico (OCR) muy estricto.\n"
                "En este documento hay respuestas de un estudiante (procedimientos escritos "
                "a mano, o tachones sobre opciones).\n"
                'Si por error ves una hoja que dice "Clave del Docente", '
                "¡TIENES PROHIBIDO LEERLA! Solo debes leer las respuestas del estudiante.\n\n"
                "Retorna ÚNICAMENTE un JSON válido describiendo las respuestas del estudiante "
                "y extrayendo su nombre."
            )

        # Build content for vision
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

        # Normalize array format for estandarizada
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
    ) -> dict:
        """
        Grade a student's evaluation by comparing OCR results with answer key.
        Replaces n8n's OpenAI evaluator chain step.
        """
        user_prompt = (
            f"Área: {area}\n"
            f"Tipo de evaluación: {tipo}\n\n"
            f"Contexto de la evaluación (Incluye Clave de respuestas o Solucionario):\n"
            f"{json.dumps(contexto_evaluacion, ensure_ascii=False, indent=2) if contexto_evaluacion else 'No disponible'}\n\n"
            f"Respuestas extraídas del estudiante (generadas por visión OCR):\n"
            f"{json.dumps(vision_data, ensure_ascii=False, indent=2)}\n\n"
        )

        if estudiantes_lote:
            user_prompt += (
                f"LISTA DE ESTUDIANTES DEL LOTE:\n"
                f"{json.dumps(estudiantes_lote, ensure_ascii=False)}\n\n"
                "La OCR extrajo el 'nombre_estudiante'. Identifica a qué estudiante de "
                "la lista pertenece usando similitud de nombres y devuelve su 'estudiante_id'. "
                "Si no logras identificarlo con seguridad, devuelve null.\n\n"
            )

        user_prompt += (
            "INSTRUCCIONES:\n"
            "Si es una prueba estandarizada (selección múltiple):\n"
            "1. Compara ESTRICTAMENTE cada respuesta del estudiante con la clave_respuestas del contexto.\n"
            "2. Calcula el total de correctas sobre el total de preguntas.\n"
            "3. Calcula la nota de 1.0 a 10.0 proporcionalmente: 1 + (Correctas / Total) * 9.\n"
            "4. Para la retroalimentación, enumera EXCLUSIVAMENTE las preguntas en las que el "
            "estudiante FALLÓ (es decir, la opción marcada es diferente a la clave). "
            "¡Cuidado! Si el estudiante marcó \"C\" y la clave era \"C\", eso es un ACIERTO "
            "y NO debe incluirse en la lista de fallos.\n\n"
            "Si es una evaluación abierta:\n"
            "Evalúa los procedimientos, califica de 0 a 10 y justifica detalladamente "
            "en la retroalimentación.\n\n"
            "Retorna ÚNICAMENTE un JSON válido con esta estructura:\n"
            "{\n"
            '  "nota": 7.5,\n'
            '  "retroalimentacion": "Tuviste X correctas de Y. Fallaste en la 1 '
            '(marcaste A, era B) y en la 4 (marcaste D, era C)."'
        )

        if estudiantes_lote:
            user_prompt += ',\n  "estudiante_id": "uuid-del-estudiante"'

        user_prompt += "\n}"

        response = await self.client.chat.completions.create(
            model=settings.openai_vision_model,  # gpt-4o for grading accuracy
            messages=[
                {"role": "user", "content": user_prompt},
            ],
            temperature=0,
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
