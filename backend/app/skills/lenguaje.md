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

Úsalo para destacar definiciones, propiedades o reglas gramaticales importantes.
El contenido dentro del recuadro se rendereará con fondo coloreado y
borde.

Formato:

> 📦 RECUADRO
> **Título o concepto:**
> Contenido aquí.
> O múltiples líneas con ejemplos.

Ejemplo real para lenguaje:

> 📦 RECUADRO
> **Los Sustantivos Propios**
> Son aquellos que identifican a una persona, animal o lugar específico y se escriben siempre con mayúscula inicial.
> Por ejemplo: Colombia, María, Bogotá.

Lo anterior va a generar:
[Recuadro con fondo coloreado]
Los Sustantivos Propios
Son aquellos que identifican a una persona, animal o lugar específico y se escriben siempre con mayúscula inicial.
Por ejemplo: Colombia, María, Bogotá.
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
