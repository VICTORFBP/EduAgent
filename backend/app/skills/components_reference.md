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
| Número | Potencia | Resultado |<SALTO>|--------|----------|-----------|<SALTO>| 9      | $3^2$    |           |<SALTO>| 16     | $4^2$    |           |
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

Para listas de ejercicios cortos en paralelo (ideal para operaciones matemáticas o emparejamiento rápido). NUNCA generes listas largas con guiones bajos (`___`) sueltas; agrupalas en una grilla para ahorrar espacio.

**Ejemplos de uso (¡Aprende de esto!):**
- ❌ INCORRECTO (Lista suelta):
  `- $3 \times 4 =$ ___`
  `- $5 \times 6 =$ ___`
  `- $7 \times 8 =$ ___`

- ✅ CORRECTO (Usar el componente):
  `> 📦 GRILLA`
  `> $3 \times 4 =$ ___`
  `> $5 \times 6 =$ ___`
  `> $7 \times 8 =$ ___`

---

## Encabezados de sección (niveles)

- `## Sección principal` → Encabezado grande con línea
- `### Subsección` → Encabezado secundario con línea fina

No uses `#` nivel 1, está reservado para el título del documento.

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
