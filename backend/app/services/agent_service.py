"""EduAgent — Agent Service: OpenAI function-calling orchestrator with SSE streaming."""

import json
import logging
from typing import AsyncGenerator

from openai import AsyncOpenAI
from app.config import get_settings
from app.services.agent_tools import TOOLS_SCHEMA, execute_tool

logger = logging.getLogger(__name__)
settings = get_settings()

SYSTEM_PROMPT = """Eres EduAgent, un asistente pedagógico inteligente y amable diseñado para ayudar a los docentes rurales de la Institución Educativa El Crucero.

Tienes acceso a las siguientes herramientas:
- **consultar_documentos**: busca en los documentos pedagógicos del MEN y del docente (lineamientos, guías curriculares, etc.)
- **generar_planeacion**: crea una planeación curricular completa con objetivos, actividades y criterios de evaluación
- **listar_planeaciones**: muestra las planeaciones recientes del docente
- **listar_estudiantes**: lista los estudiantes registrados
- **ver_estadisticas**: muestra métricas y progreso del docente

Directrices:
1. Usa las herramientas proactivamente cuando el docente lo necesite — no esperes a que te lo pidan explícitamente.
2. Para generar planeaciones, si el docente no especifica algún campo (duracion, recursos), usa valores por defecto razonables.
3. Responde siempre en español, con un tono cálido, profesional y motivador.
4. Cuando presentes listas o resultados de herramientas, formatea la respuesta de manera clara y estructurada.
5. Si necesitas más información para completar una tarea, pregunta de manera específica y concisa.
6. No inventes información pedagógica — basa tus respuestas en los documentos cargados.
"""


class AgentService:
    """Orchestrates multi-turn conversations with tool-calling via OpenAI."""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        self.model = settings.agent_model

    async def stream_chat(
        self,
        message: str,
        docente_id: str,
        session_id: str | None = None,
        history: list[dict] | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        Run the agent loop and yield SSE-formatted event strings.

        Event types emitted:
          - tool_call   : agent decided to use a tool   {"name": str, "arguments": dict}
          - tool_result : tool finished executing        {"name": str, "result": str}
          - content     : streaming text chunk           {"delta": str}
          - done        : conversation complete          {"content": str}
          - error       : unrecoverable error            {"message": str}
        """

        # Build conversation history
        messages: list[dict] = [{"role": "system", "content": SYSTEM_PROMPT}]
        if history:
            for h in history[-10:]:  # Keep last 10 turns for context window
                role = h.get("role")
                content = h.get("content", "")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": message})

        # ── Agent loop (max 5 iterations to prevent infinite tool calls) ──
        MAX_ITERATIONS = 5
        final_content = ""

        for iteration in range(MAX_ITERATIONS):
            try:
                # Non-streaming first call to decide if we need tools
                response = await self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    tools=TOOLS_SCHEMA,
                    tool_choice="auto",
                    temperature=0.4,
                    max_tokens=2000,
                )
            except Exception as e:
                logger.error(f"OpenAI API error: {e}")
                yield _sse("error", {"message": f"Error del agente: {str(e)}"})
                return

            choice = response.choices[0]
            msg = choice.message

            # ── No tool calls — stream the final answer ──
            if not msg.tool_calls:
                final_text = msg.content or ""

                # Stream the content word by word for a nice UX
                words = final_text.split(" ")
                streamed = []
                for i, word in enumerate(words):
                    chunk = word + (" " if i < len(words) - 1 else "")
                    streamed.append(chunk)
                    yield _sse("content", {"delta": chunk})

                final_content = "".join(streamed)
                yield _sse("done", {"content": final_content})
                return

            # ── There are tool calls — execute them ──
            # Add assistant message with tool calls to history
            messages.append({
                "role": "assistant",
                "content": msg.content,
                "tool_calls": [
                    {
                        "id": tc.id,
                        "type": "function",
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments,
                        },
                    }
                    for tc in msg.tool_calls
                ],
            })

            # Execute each tool call
            for tool_call in msg.tool_calls:
                tool_name = tool_call.function.name
                try:
                    tool_args = json.loads(tool_call.function.arguments)
                except json.JSONDecodeError:
                    tool_args = {}

                # Emit tool_call event so frontend can show "using tool X..."
                yield _sse("tool_call", {"name": tool_name, "arguments": tool_args})

                # Execute tool
                try:
                    result = await execute_tool(
                        name=tool_name,
                        arguments=tool_args,
                        docente_id=docente_id,
                        session_id=session_id,
                    )
                except Exception as exec_err:
                    result = f"Error ejecutando {tool_name}: {str(exec_err)}"
                    logger.error(f"Tool execution error ({tool_name}): {exec_err}")

                # Emit tool_result event
                yield _sse("tool_result", {"name": tool_name, "result": result})

                # Add tool result to messages for next iteration
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": result,
                })

        # Safety: if we hit max iterations, emit whatever we have
        yield _sse("error", {"message": "El agente superó el límite de iteraciones. Por favor intenta de nuevo."})


def _sse(event: str, data: dict) -> str:
    """Format a Server-Sent Event string."""
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


# Singleton
agent_service = AgentService()

