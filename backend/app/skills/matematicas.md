---
# Skill: Matemáticas

## Formato de salida — OBLIGATORIO

El campo contenido_grados debe ser SIEMPRE Markdown puro.
NUNCA generes HTML, etiquetas, ni clases CSS.
El sistema convierte el Markdown a HTML automáticamente.

## Notación matemática

Usa exclusivamente estos delimitadores LaTeX:
- Inline: \( expresión \)
- Bloque: \[ expresión \]

Ejemplos correctos:
- Fracción: \(\frac{3}{8}\)
- Potencia: \(2^3 = 8\)
- Raíz: \(\sqrt{16} = 4\)
- Multiplicación: \(3 \times 4 = 12\)

NUNCA uses: $...$  $$...$$  \(...\) con barras dobles  ni texto plano 
como "3/8" o "2 elevado a 4".

## Tipos de pregunta disponibles

Usa solo los que el docente haya pedido, o los más apropiados al tema:

- Selección múltiple: A. [ ] B. [ ] C. [ ] D. [ ]
- Pregunta abierta: con caja de respuesta
- Procedimiento paso a paso: con caja de respuesta
- Completar espacios: ______
- Falso / Verdadero: V. [ ]  F. [ ]
- Problema de contexto colombiano

## Principios pedagógicos

- Adapta el nivel de dificultad a cada grado.
- Usa contextos cotidianos colombianos (mercado, campo, escuela rural).
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
- Si requiere dibujo o proceso matemático largo: Usa un `> 📦 RECUADRO` con las instrucciones y debajo `[LINEAS:10]`.

EJEMPLO CORRECTO DE RESPUESTA LARGA:
1. Escribe el procedimiento para resolver esta ecuación.

| **Escribe aquí tu respuesta:** |
| :--- |
| &nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp; |

EJEMPLO CORRECTO DE PROCEDIMIENTO GRÁFICO:
> 📦 PROCEDIMIENTO
> Dibuja y resuelve la fracción geométrica.

[LINEAS:10]

**INSTRUCCIÓN OBLIGATORIA DE FRAGMENTO:**
Siempre incluye pedagógicamente un fragmento `> 📖 FRAGMENTO` contextualizado para plantear problemas reales del entorno.

### Caja de respuesta abierta
Tamaño "media" (default), "alta" para producción escrita, "baja" para respuesta corta. NUNCA la indentes.

| **Escribe aquí tu respuesta:** |
| :--- |
| &nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp; |

### Líneas para respuesta manuscrita
Inserta el texto literal: `[LINEAS:N]` (N = número de líneas, de 3 a 12). NUNCA lo indentes.

### Recuadro de fórmula o concepto clave
Úsalo para destacar fórmulas matemáticas o definiciones importantes. NUNCA lo indentes.

Ejemplo correcto:
> 📦 RECUADRO
> **El Perímetro**
> Es la suma de las medidas de todos los lados de una figura.

### Falso y Verdadero
Usa una tabla con columnas Afirmación | V | F. NUNCA la indentes.

Ejemplo correcto:
2. Responde verdadero o falso:

| Afirmación | V | F |
|:-----------|:-:|:-:|
| Un triángulo tiene 4 lados | | |

### Selección múltiple
A. [ ] opción uno
B. [ ] opción dos

### Fragmento de lectura
> 📖 FRAGMENTO
> Texto del fragmento aquí, en cursiva con borde lateral.

### Grilla de ejercicios (3 columnas)
> 🔢 GRILLA
> \(3 \times 4 =\) ___
> \(5 \times 6 =\) ___
> \(7 \times 8 =\) ___
---
