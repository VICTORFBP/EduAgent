> **NORMAS DE FORMATO OBLIGATORIAS**: Sigue estrictamente las normas de `document_standards.md` para márgenes, espaciado y distribución.

# Referencia pedagógica (Skill): Ciencias

**Esto NO es una plantilla fija.** Orienta talleres de ciencias naturales o sociales con variedad y espacios de respuesta claros.

## Formato de salida — OBLIGATORIO

El campo contenido_grados debe ser SIEMPRE Markdown puro.
NUNCA generes HTML, etiquetas, ni clases CSS.
El sistema convierte el Markdown a HTML automáticamente.

## Referencias de contenido

- Combina análisis, preguntas cerradas (V/F, selección múltiple) y prácticas (experimento casero, exploración del entorno).
- Experimentos: listas de materiales + pasos numerados; precaución en `blockquote` si aplica.
- Espacios de respuesta: Usa la marca `[LINEAS:5]` para líneas manuscritas o tablas para respuestas estructuradas.
- **5–8 ítems** por grado; sin respuestas en `contenido_grados`.

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

Úsalo para destacar definiciones, propiedades o resúmenes importantes.
El contenido dentro del recuadro se rendereará con fondo coloreado y
borde.

Formato:

> 📦 RECUADRO
> **Título o concepto:**
> Contenido aquí.
> O múltiples líneas con ejemplos.

Ejemplo real para ciencias:

> 📦 RECUADRO
> **El Ciclo del Agua**
> Es el proceso por el cual el agua se mueve en la Tierra.
> Tiene cuatro etapas principales: Evaporación, Condensación, Precipitación y Escorrentía.

Lo anterior va a generar:
[Recuadro con fondo coloreado]
El Ciclo del Agua
Es el proceso por el cual el agua se mueve en la Tierra.
Tiene cuatro etapas principales: Evaporación, Condensación, Precipitación y Escorrentía.
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
