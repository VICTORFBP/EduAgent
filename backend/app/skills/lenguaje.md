---
# Skill: Lenguaje

## Formato de salida — OBLIGATORIO

El campo contenido_grados debe ser SIEMPRE Markdown puro.
NUNCA generes HTML, etiquetas, ni clases CSS.

## Tipos de pregunta disponibles

- Selección múltiple: A. [ ] B. [ ] C. [ ] D. [ ]
- Pregunta abierta: con caja de respuesta
- Completar espacios: ______
- Falso / Verdadero: V. [ ]  F. [ ]
- Producción escrita: con caja de respuesta amplia
- Lectura de fragmento + preguntas de comprensión

## Principios pedagógicos

- Los fragmentos de lectura deben estar ambientados en Colombia
  (plaza de mercado, río, colegio rural, fútbol, fiestas locales).
- Las preguntas deben incluir comprensión literal, inferencial
  y crítica — no solo recuperación de datos.
- Si el docente especificó un formato, respétalo exactamente.
- Si no especificó nada, elige el formato más apropiado al tema.
- NO impongas estructura rígida.
- NO incluyas respuestas en contenido_grados.

## Componentes disponibles para el taller

El sistema convierte tu Markdown a HTML automáticamente.
Para activar componentes de diseño especiales, usa estas marcas exactas.
**REGLA CRÍTICA DE FORMATO:** ¡NUNCA INDENTES los componentes! Las marcas `[LINEAS:N]`, `> 📦 RECUADRO`, `> 📖 FRAGMENTO` y las tablas `|...|` deben ir SIEMPRE al inicio de la línea (cero espacios a la izquierda), incluso si están debajo de un ítem de lista enumerada.

**INSTRUCCIÓN OBLIGATORIA PARA RESPUESTAS:**
Cada pregunta abierta O pregunta que requiera respuesta escrita DEBE ir seguida de UNO de estos componentes visuales:
- Si requiere 1-2 líneas: `[LINEAS:2]`
- Si requiere 3-5 líneas: `[LINEAS:5]`
- Si requiere párrafo largo: tabla markdown con caja de respuesta (ver abajo).
- Si requiere espacio amplio de análisis o borrador: Usa un `> 📦 RECUADRO` con las instrucciones y debajo `[LINEAS:10]`.

EJEMPLO CORRECTO DE RESPUESTA LARGA:
1. Escribe tu opinión sobre la lectura principal.

| **Escribe aquí tu respuesta:** |
| :--- |
| &nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp; |

EJEMPLO CORRECTO DE ANÁLISIS:
> 📦 ANÁLISIS
> Desarrolla tu argumento principal en el siguiente espacio.

[LINEAS:10]

**INSTRUCCIÓN OBLIGATORIA DE FRAGMENTO:**
Siempre incluye pedagógicamente un fragmento `> 📖 FRAGMENTO` literario o informativo contextualizado en el entorno para iniciar el taller.

### Caja de respuesta abierta
Tamaño "media" (default), "alta" para producción escrita, "baja" para respuesta corta. NUNCA la indentes.

| **Escribe aquí tu respuesta:** |
| :--- |
| &nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp; |

### Líneas para respuesta manuscrita
Inserta el texto literal: `[LINEAS:N]` (N = número de líneas, de 3 a 12). NUNCA lo indentes.

### Recuadro de fórmula o concepto clave
Úsalo para destacar definiciones gramaticales o resúmenes. NUNCA lo indentes.

Ejemplo correcto:
> 📦 RECUADRO
> **Los Verbos**
> Son palabras que expresan acciones o estados.

### Falso y Verdadero
Usa una tabla con columnas Afirmación | V | F. NUNCA la indentes.

Ejemplo correcto:
2. Responde verdadero o falso:

| Afirmación | V | F |
|:-----------|:-:|:-:|
| El sustantivo nombra objetos | | |

### Selección múltiple
A. [ ] opción uno
B. [ ] opción dos
C. [ ] opción tres
D. [ ] opción cuatro

### Fragmento de lectura
> 📖 FRAGMENTO
> Texto del fragmento aquí, en cursiva con borde lateral.

### Grilla de ejercicios (3 columnas)
> 🔢 GRILLA
> \(3 \times 4 =\) ___
> \(5 \times 6 =\) ___
> \(7 \times 8 =\) ___
---
