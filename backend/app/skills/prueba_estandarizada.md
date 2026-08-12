# Skill: Prueba Estandarizada — Selección Múltiple (Tipo ICFES / Saber)

Este skill se activa cuando el docente solicita una **prueba estandarizada** (tipo SABER, ICFES, simulacro o selección múltiple).

## Reglas ABSOLUTAS del formato

1. **SOLO preguntas de selección múltiple con única respuesta** (A, B, C, D).
2. **Entre 10 y 20 preguntas** por grado (15 recomendado).
3. **Material de referencia del docente / Archivos adjuntos**:
   - Si se adjunta un documento o imagen de referencia, extrae y formula las preguntas basándote en los textos, problemas, diagramas o casos contenidos en ese material.
4. **Cada pregunta** debe tener:
   - Un enunciado claro (puede incluir un fragmento de texto `> 📖 FRAGMENTO`, tabla o situación problémica).
   - Exactamente 4 opciones: A, B, C, D.
   - Una sola respuesta correcta clara e indiscutible.
5. **NO uses** `[LINEAS:N]`, cajas de respuesta abierta, ni `> 🎨 DIBUJO` en el contenido de la prueba.
6. **NO incluyas** las respuestas correctas en `contenido_grados`. Solo el enunciado y las opciones. Las respuestas van EXCLUSIVAMENTE en `clave_respuestas`.

## Formato de preguntas (OBLIGATORIO)

Usa SIEMPRE el formato de selección múltiple con casilla:

```
## Competencia: [Nombre de la competencia]

**1.** [Enunciado de la pregunta]

A. [ ] [Opción A]
B. [ ] [Opción B]
C. [ ] [Opción C]
D. [ ] [Opción D]

**2.** [Enunciado de la segunda pregunta]

A. [ ] [Opción A]
B. [ ] [Opción B]
C. [ ] [Opción C]
D. [ ] [Opción D]
```

## Estructura del contenido por grado

Organiza las preguntas en 3 o 4 competencias/ejes temáticos. Por ejemplo para Matemáticas:
- **Competencia: Razonamiento** (4–5 preguntas)
- **Competencia: Comunicación** (4–5 preguntas)
- **Competencia: Resolución de problemas** (4–5 preguntas)

Para Lenguaje:
- **Competencia: Comprensión lectora** (con fragmento de texto → 5–6 preguntas)
- **Competencia: Gramática y ortografía** (4–5 preguntas)
- **Competencia: Producción textual** (4–5 preguntas)

## Campo `clave_respuestas` (JSON dict — OBLIGATORIO)

**NO uses Markdown para la clave.** Devuelve un diccionario JSON donde la clave es el número de pregunta (string) y el valor es la letra de la respuesta correcta:

```json
{
  "1": "B",
  "2": "D",
  "3": "A",
  "4": "C",
  ...
}
```

Este diccionario se usará para generar automáticamente la hoja de respuestas oficial con las respuestas marcadas para el docente.

## Instrucciones pedagógicas

- Adapta las preguntas al grado y al tema indicado.
- Para grados superiores: mayor abstracción, preguntas de análisis o inferencia.
- Para grados inferiores: enunciados más cortos, situaciones concretas y cotidianas.
- Contextualiza en el entorno colombiano rural cuando sea posible.
- Cada distractor (opción incorrecta) debe ser plausible pero claramente incorrecto para alguien que domina el tema.
- Varía el tipo de enunciado: algunos con fragmento de lectura (`> 📖 FRAGMENTO`), algunos con tabla de datos, otros directos.

## PROHIBIDO

- Respuestas correctas visibles en `contenido_grados`
- Preguntas abiertas o de desarrollo
- Más de 20 preguntas por grado
- Menos de 10 preguntas por grado
- Clave de respuestas en formato Markdown (debe ser JSON dict)
- Formato de opción sin casilla: `a)`, `1.`, etc.
