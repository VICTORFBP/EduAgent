> **NORMAS DE FORMATO OBLIGATORIAS**: Sigue estrictamente las normas de `document_standards.md` para márgenes, espaciado y distribución.

# Referencia pedagógica (Skill): Matemáticas

**Esto NO es una plantilla fija.** Son criterios de calidad y ejemplos de formato para que el taller sea completo, variado y apropiado al tema y grado. Adapta secciones y cantidad de ejercicios al contexto de la planeación.

## Formato de salida

**Planeación curricular** (`actividades.apertura`, `desarrollo`, `cierre`): texto o **Markdown** (no HTML). LaTeX con `$...$` usando palabras simples cuando sea posible (`sqrt(36)` en lugar de `\sqrt{36}` dentro del JSON).

**Taller / actividad evaluativa** (`contenido_grados` del flujo de actividad): fragmento **HTML** (sin `<html>`, `<body>` ni scripts). La app lo renderiza e imprime con estilos.

- **`instrucciones`** y **`clave_respuestas`** (actividad): Markdown (solucionario para el docente).
- **Matemáticas en HTML**: LaTeX con `$...$` inline y `$$...$$` en bloque. Ejemplo: `$2^5 = 32$`, `$\sqrt[3]{216}$`, `$\log_2 8 = 3$`. No uses `\( \)` ni texto plano tipo "dos a la cuatro".

## Clases CSS recomendadas (referencia visual)

| Clase | Uso |
|-------|-----|
| `taller-encabezado` | Tabla institucional (área, módulo, guía, competencia) con `colspan`/`rowspan` si aplica |
| `taller-section` | Bloque de una acción o parte del taller |
| `taller-titulo-seccion` | Título en mayúsculas (ej. ACCIÓN INTERPRETATIVA) |
| `taller-instruccion` | Enunciado de la actividad |
| `taller-tabla` | Tablas de completar (varias columnas: factores, base, exponente, potencia, lectura…) |
| `taller-grilla` / `taller-grilla-3` | Rejilla de ejercicios (CSS grid 4 o 3 columnas) |
| `taller-grilla-item` | Cada celda de ejercicio (`$21^2 =$` + espacio) |
| `taller-celda-vacia` | Celda en blanco para el estudiante |
| `taller-espacio-respuesta` | Etiqueta "Escribe procedimiento y respuesta" |
| `taller-lineas` | Líneas para procedimiento manuscrito |

## Contenido esperado (referencia, no copiar literal)

Por grado, busca **1–2 páginas** de material con:

1. **Tabla interpretativa** (ej. factores iguales ↔ potencia ↔ lectura), con **una fila de ejemplo completa**.
2. **Práctica numérica** en grilla o tabla (potencias, raíces o logaritmos según el tema).
3. **Relación potencia–radicación–logaritmación** cuando el tema lo incluya (tabla o flechas `$a^b = c \rightarrow \log_a c = b$`).
4. **Al menos un problema contextual** (granja, mercado, medidas rurales).
5. **5–8 ítems evaluativos** por grado, progresivos; sin respuestas ni pistas en `contenido_grados`.

## Ejemplo mínimo de estructura HTML (orientativo)

```html
<section class="taller-section">
  <h2 class="taller-titulo-seccion">ACCIÓN INTERPRETATIVA</h2>
  <p class="taller-instruccion">Completa el cuadro. Observa el ejemplo.</p>
  <table class="taller-tabla">
    <thead><tr><th>Factores iguales</th><th>Potencia</th><th>Base</th><th>Exponente</th><th>Potencia</th><th>Lectura</th></tr></thead>
    <tbody>
      <tr><td>$2 \times 2 \times 2 \times 2$</td><td>$2^4$</td><td>2</td><td>4</td><td>16</td><td>Dos a la cuarta</td></tr>
      <tr><td>$7 \times 7 \times 7$</td><td class="taller-celda-vacia"></td><td class="taller-celda-vacia"></td><td class="taller-celda-vacia"></td><td class="taller-celda-vacia"></td><td class="taller-celda-vacia"></td></tr>
    </tbody>
  </table>
</section>
```

## Otras reglas

- Respeta instrucciones exactas del docente (cantidad y tipo de ejercicios).
- Contexto multigrado Escuela Nueva: un `contenido_grados` distinto por cada grado solicitado.
- Selección múltiple en HTML: `A. [ ] opción` (casillas vacías).
