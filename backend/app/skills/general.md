> **NORMAS DE FORMATO OBLIGATORIAS**: Sigue estrictamente las normas de `document_standards.md` para márgenes, espaciado y distribución.

# Referencia pedagógica (Skill): General

**Esto NO es una plantilla fija.** Orienta variedad y claridad en talleres de áreas que no tienen skill propia (sociales, convivencia, etc.).

## Formato de salida — OBLIGATORIO

El campo contenido_grados debe ser SIEMPRE Markdown puro.
NUNCA generes HTML, etiquetas, ni clases CSS.
El sistema convierte el Markdown a HTML automáticamente.

## Referencias de contenido

- Evita ejercicios repetitivos; combina análisis, preguntas cerradas y actividades prácticas (contexto rural / multigrado).
- Deja espacios visibles para respuestas (tablas o líneas).
- **5–8 ítems** por grado; material solo para el estudiante en `contenido_grados`.
- Ajusta al `tipo_actividad` o instrucciones del docente cuando existan.

## Componentes disponibles para el taller

El sistema convierte tu Markdown a HTML automáticamente.
Para activar componentes de diseño especiales, usa estas marcas exactas.
**REGLA CRÍTICA DE FORMATO:** ¡NUNCA INDENTES los componentes! Las marcas `[LINEAS:N]`, `> 📦 RECUADRO`, `> 📖 FRAGMENTO` y las tablas `|...|` deben ir SIEMPRE al inicio de la línea (cero espacios a la izquierda), incluso si están debajo de un ítem de lista enumerada.

**INSTRUCCIÓN OBLIGATORIA PARA RESPUESTAS:**
Cada pregunta abierta O pregunta que requiera respuesta escrita DEBE ir seguida de UNO de estos componentes visuales:
- Si requiere 1-2 líneas: `[LINEAS:2]`
- Si requiere 3-5 líneas: `[LINEAS:5]`
- Si requiere párrafo largo: tabla markdown con caja de respuesta (ver abajo).
- Si es dibujo: Usa un `> 📦 RECUADRO` con las instrucciones del dibujo y debajo `[LINEAS:10]`.

EJEMPLO CORRECTO DE RESPUESTA LARGA:
1. Describe brevemente qué significa este valor.

| **Escribe aquí tu respuesta:** |
| :--- |
| &nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp;<br>&nbsp; |

EJEMPLO CORRECTO DE DIBUJO:
> 📦 DIBUJO
> Realiza un dibujo representativo.

[LINEAS:10]

**INSTRUCCIÓN OBLIGATORIA DE FRAGMENTO:**
Siempre incluye pedagógicamente un fragmento `> 📖 FRAGMENTO` contextualizado para introducir el tema principal de la actividad.

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
> **Concepto Importante**
> Contenido aquí.

### Falso y Verdadero
Usa una tabla con columnas Afirmación | V | F. NUNCA la indentes.

Ejemplo correcto:
2. Responde verdadero o falso:

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
