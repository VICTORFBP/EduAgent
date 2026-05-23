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
Para activar componentes de diseño especiales, usa estas
marcas exactas en el Markdown. El sistema las reconoce y
aplica el CSS correspondiente.

### Caja de respuesta abierta
Tamaño "media" (default), "alta" para producción escrita,
"baja" para respuesta corta.

| **Escribe aquí tu respuesta:** |
| :--- |
| &nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp; |

### Líneas para respuesta manuscrita
Inserta el texto literal: [LINEAS:5]
El número indica cuántas líneas generar (3 a 12).

### Recuadro de fórmula o concepto clave

Úsalo para destacar definiciones, propiedades o fórmulas importantes.
El contenido dentro del recuadro se rendereará con fondo coloreado y
borde.

Formato:

> 📦 RECUADRO
> **Título o concepto:**
> Contenido aquí. Puede incluir LaTeX: \(a^2 + b^2 = c^2\)
> O múltiples líneas con ejemplos.

Ejemplo real para multiplicación:

> 📦 RECUADRO
> **La multiplicación es suma abreviada**
> \(3 \times 4 = 3 + 3 + 3 + 3 = 12\)
> \(5 \times 6 = 5 + 5 + 5 + 5 + 5 + 5 = 30\)

Lo anterior va a generar:
[Recuadro con fondo coloreado]
La multiplicación es suma abreviada
3 × 4 = 3 + 3 + 3 + 3 = 12
5 × 6 = 5 + 5 + 5 + 5 + 5 + 5 = 30
[fin recuadro]

### Falso y Verdadero
Usa una tabla con columnas Afirmación | V | F:

| Afirmación | V | F |
|:-----------|:-:|:-:|
| El sol sale por el oeste | | |
| El agua hierve a 100°C | | |

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
