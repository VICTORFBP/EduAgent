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
Para activar componentes de diseño especiales, usa estas marcas exactas.
**REGLA CRÍTICA DE FORMATO:** ¡NUNCA INDENTES los componentes! Las marcas `[LINEAS:N]`, `> 📦 RECUADRO`, `> 📖 FRAGMENTO` y las tablas `|...|` deben ir SIEMPRE al inicio de la línea (cero espacios a la izquierda), incluso si están debajo de un ítem de lista enumerada.

**INSTRUCCIÓN OBLIGATORIA PARA RESPUESTAS:**
Cada pregunta abierta O pregunta que requiera respuesta escrita DEBE ir seguida de UNO de estos componentes visuales:
- Si requiere 1-2 líneas: `[LINEAS:2]`
- Si requiere 3-5 líneas: `[LINEAS:5]`
- Si requiere párrafo largo: tabla markdown con caja de respuesta (ver abajo).
- Si es dibujo: Usa un `> 📦 RECUADRO` con las instrucciones del dibujo y debajo `[LINEAS:10]` para el espacio.

EJEMPLO CORRECTO DE RESPUESTA LARGA:
1. Describe brevemente cada etapa del ciclo del agua.

| **Escribe aquí tu respuesta:** |
| :--- |
| &nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp; |

EJEMPLO CORRECTO DE DIBUJO:
> 📦 DIBUJO
> Dibuja el ciclo del agua con las 4 etapas claramente etiquetadas.

[LINEAS:10]

**INSTRUCCIÓN OBLIGATORIA DE FRAGMENTO:**
Siempre incluye pedagógicamente un fragmento `> 📖 FRAGMENTO` contextualizado en tu país/entorno (ej. ecosistemas locales) para enriquecer el taller.

### Caja de respuesta abierta
Tamaño "media" (default), "alta" para producción escrita, "baja" para respuesta corta. NUNCA la indentes.

| **Escribe aquí tu respuesta:** |
| :--- |
| &nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp; |

### Líneas para respuesta manuscrita
Inserta el texto literal: `[LINEAS:N]` (N = número de líneas, de 3 a 12). NUNCA lo indentes.

### Recuadro de fórmula o concepto clave
Úsalo para destacar definiciones o resúmenes. NUNCA lo indentes.

Ejemplo correcto:
> 📦 RECUADRO
> **El Ciclo del Agua**
> Es el proceso por el cual el agua se mueve en la Tierra.

### Falso y Verdadero
Usa una tabla con columnas Afirmación | V | F. NUNCA la indentes.

Ejemplo correcto:
2. Responde verdadero o falso:

| Afirmación | V | F |
|:-----------|:-:|:-:|
| El agua hierve a 100°C | | |

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
---
