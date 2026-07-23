# Referencia de Componentes — EduAgent (Typst PDF)

El sistema convierte tu Markdown directamente a un **PDF generado con Typst**.
Escribe SOLO Markdown puro usando los patrones indicados aquí.
NUNCA escribas HTML, etiquetas `<div>`, `<span>`, `<style>`, ni CSS.

---

## REGLA CRÍTICA DE INDENTACIÓN

Los bloques especiales `[LINEAS:N]`, `> 📦 RECUADRO`, `> 📖 FRAGMENTO`, `> 🎨 DIBUJO`
y las tablas `|...|` deben ir **SIEMPRE al inicio de la línea (cero espacios a la izquierda)**,
incluso si están debajo de un ítem de lista enumerada.

---

## FILOSOFÍA DE USO

Estos componentes son **herramientas**, no una checklist. NO tienes que usar todos en cada actividad.
Elige los que mejor se adapten al tema, grado y tipo de ejercicio. La creatividad pedagógica
y la variedad son más importantes que la cantidad de componentes usados.

---

## Notación matemática (LaTeX)

Usa SOLO estos delimitadores:
- Inline: `$expresión$`  → ej. `$2^3 = 8$`, `$\sqrt{16} = 4$`, `$\frac{3}{8}$`
- Bloque (ecuación centrada): `$$expresión$$`  → ej. `$$\frac{a+b}{c} = d$$`

NUNCA uses: `\( \)`, `\[ \]`, ni texto plano como "2 elevado a 4" o "raíz cuadrada de 9".

---

## Espacios de respuesta (OBLIGATORIO para preguntas abiertas)

Cada pregunta que requiera que el estudiante escriba DEBE ir seguida de un componente de líneas. NUNCA generes guiones bajos (`______`) para simular líneas.

| Necesidad | Marca exacta |
|-----------|-------------|
| 1–2 líneas cortas | `[LINEAS:2]` |
| 3–5 líneas (párrafo) | `[LINEAS:5]` |
| Respuesta larga (análisis, ensayo) | `[LINEAS:8]` |
| Espacio amplio (dibujo, esquema) | `> 🎨 DIBUJO` + instrucción |

**Ejemplos de uso (¡Aprende de esto!):**
- ❌ INCORRECTO (Usar guiones bajos):
  `¿Qué es la fotosíntesis?`
  `______________________`

- ✅ CORRECTO (Usar el componente):
  `¿Qué es la fotosíntesis?`
  `[LINEAS:4]`

---

## Selección múltiple (OBLIGATORIO con casilla)

Usa SIEMPRE este formato exacto con mayúsculas y casilla `[ ]`:

```
A. [ ] Primera opción
B. [ ] Segunda opción
C. [ ] Tercera opción
D. [ ] Cuarta opción
```

NUNCA uses `a)`, `b)`, `A)` ni ningún formato sin casilla. La casilla `[ ]` es obligatoria.

---

## Verdadero o Falso (OBLIGATORIO como tabla Markdown)

Usa SIEMPRE este formato de tabla con la cabecera exacta `Afirmación | V | F`. Recuerda usar `<SALTO>` para separar las filas:

```
| Afirmación | V | F |<SALTO>|:-----------|:-:|:-:|<SALTO>| La raíz cuadrada de 25 es 5 | | |<SALTO>| $2^4 = 16$ | | |<SALTO>| El agua hierve a 100°C | | |
```

NUNCA escribas "Afirmación V F" como texto plano. SIEMPRE usa la tabla Markdown con `<SALTO>`.

---

## Tablas de completar

Usa tablas Markdown estándar con la sintaxis `<SALTO>` para separar filas. El sistema las renderiza con cabecera coloreada automáticamente.

```
| Número | Potencia | Resultado |<SALTO>|--------|----------|-----------<SALTO>| 9      | $3^2$    |           |<SALTO>| 16     | $4^2$    |           |
```

---

## Recuadro destacado (concepto, nota, advertencia)

```
> 📦 RECUADRO
> **Título opcional**
> Contenido del recuadro aquí.
```

---

## Fragmento de lectura

Siempre que sea pedagógicamente útil, incluye un fragmento de lectura contextualizado en Colombia:

```
> 📖 FRAGMENTO
> Texto del fragmento, puede tener varios párrafos.
> Se mostrará en cursiva con borde lateral.
```

---

## Espacio de dibujo / esquema

```
> 🎨 DIBUJO
> Dibuja aquí el ciclo del agua.
```

---

## Grilla de ejercicios (3 columnas)

Para listas de ejercicios cortos en paralelo (ideal para operaciones matemáticas o emparejamiento rápido). NUNCA generes listas largas con guiones bajos (`___`) sueltas; agrúpalas en una grilla para ahorrar espacio.

> ⚠️ **CRÍTICO**: Dentro de un bloque GRILLA cada ítem va en su propia línea con `> `. NUNCA uses `<SALTO>` dentro de la GRILLA — `<SALTO>` es EXCLUSIVAMENTE para filas de tablas Markdown `|...|`.

**Ejemplos de uso (¡Aprende de esto!):**
- ❌ INCORRECTO (usar `<SALTO>` en grilla):
  `> 📦 GRILLA`
  `> $3 \times 4 =$ ___<SALTO>$5 \times 6 =$ ___`

- ✅ CORRECTO (cada ítem en su propia línea):
  `> 📦 GRILLA`
  `> $3 \times 4 =$ ___`
  `> $5 \times 6 =$ ___`
  `> $7 \times 8 =$ ___`

---

## Ejercicio de relacionar / emparejar columnas

Ideal para actividades de asociación (concepto-definición, operación-resultado, causa-efecto).
Presenta dos columnas que el estudiante debe conectar con flechas.

```
> 📋 RELACION
> Concepto ↔ Definición
> Fotosíntesis | Proceso por el cual las plantas producen su alimento
> Respiración | Intercambio de gases con el medio
> Reproducción | Capacidad de generar nuevos organismos
> Nutrición | Obtención de alimentos y nutrientes
```

Cada ítem va en su propia línea con `> `. La primera línea después de `RELACION` es el título de las columnas (separadas por `↔`). Las siguientes líneas tienen el par separado por `|`.

---

## Texto con espacios para completar (Cloze / Llenar huecos)

Ideal para evaluar vocabulario, gramática, o conceptos clave.
El estudiante llena las palabras faltantes en contexto.

```
> 🧩 COMPLETAR
> La ___ es el proceso por el cual las plantas transforman la energía del ___ en alimento.
> Para esto necesitan agua, ___ y luz solar. El producto principal es la ___ y el oxígeno.
```

Usa `___` (triple guión bajo) para marcar cada espacio que el estudiante debe completar. El sistema los renderiza como líneas punteadas dentro del texto.

---

## Ejercicio de ordenar secuencia

Para actividades donde el estudiante debe poner elementos en el orden correcto (pasos de un proceso, eventos históricos, instrucciones).

```
> 📝 ORDENAR
> Ordena los pasos del método científico:
> Formular una hipótesis
> Observar un fenómeno
> Realizar el experimento
> Analizar los resultados
> Plantear conclusiones
```

Se renderiza como una lista con recuadros vacíos numerables donde el estudiante escribe el orden.

---

## Texto para corregir errores

Para actividades de ortografía, gramática, o corrección conceptual.
El estudiante identifica y corrige los errores en el texto.

```
> ✏️ CORREGIR
> "Las plantas nesesitan luz del sol, hagua y dioxido de carbon para realisar la fotocintesis.
> Este proseso ocurre en las ojas y produce oxijeno."
```

Se renderiza con un borde especial que indica que es un texto para revisión.

---

## Escala de valoración / apreciación

Para autoevaluación, valoración de actitudes, o escalas tipo Likert.

```
> 🔢 ESCALA
> Mucho | Algo | Poco | Nada
> Entiendo el concepto de fracción
> Puedo resolver problemas con fracciones
> Me siento seguro al explicar fracciones a un compañero
```

La primera línea contiene las opciones de la escala separadas por `|`. Las siguientes líneas son los ítems a evaluar.

---

## Encabezados de sección (niveles)

- `## Sección principal` → Encabezado grande con línea
- `### Subsección` → Encabezado secundario con línea fina

No uses `#` nivel 1, está reservado para el título del documento.

---

## PATRONES DE COMPOSICIÓN (ejemplos de combinaciones creativas)

No existe una única forma de armar una actividad. Aquí hay algunos patrones que puedes combinar y adaptar:

**Patrón A — Lectura con comprensión mixta:**
Fragmento → preguntas abiertas → verdadero/falso → producción escrita

**Patrón B — Práctica progresiva:**
Recuadro conceptual → grilla de ejercicios → problemas contextualizados → reflexión

**Patrón C — Evaluación diagnóstica:**
Selección múltiple → completar → relacionar → autoevaluación con escala

**Patrón D — Taller de corrección:**
Texto con errores → identificar y corregir → reescribir correctamente

**Patrón E — Exploración científica:**
Situación problema → predicción → espacio de dibujo → análisis → conclusiones

**Patrón F — Análisis de caso:**
Fragmento de lectura → preguntas inferenciales → tabla comparativa → opinión argumentada

Puedes inventar tus propios patrones. Lo importante es que la actividad tenga coherencia pedagógica y variedad.

---

## PROHIBIDO

- HTML de cualquier tipo (`<br>`, `<b>`, `<table>`, `<style>`, etc.)
- Estilos CSS o clases
- Celdas con `&nbsp;` (usa celdas vacías normales `| |`)
- Texto de placeholder como "Respuesta del estudiante aquí"
- Incluir respuestas correctas en `contenido_grados`
- Usar `\( \)` o `\[ \]` para matemáticas (usa `$` y `$$`)
- Selección múltiple sin casilla `[ ]`
- Verdadero/Falso como texto plano (siempre tabla)
- `<SALTO>` dentro de bloques GRILLA (solo se usa en tablas `|...|`)
