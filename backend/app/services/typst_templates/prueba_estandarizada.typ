// ── EduAgent — Template de Prueba Estandarizada ──────────────────────────────
//
// Genera el PDF de una prueba de selección múltiple tipo SABER/ENLACE.
// Al final añade una Hoja de Respuestas con burbujas A B C D en 3 columnas.
//
// Importa desde actividad.typ:
//   conf, recuadro, fragmento-lectura, opcion, tabla-formato
//
// Exporta adicionalmente:
//   conf-prueba, hoja-respuestas
//
#import "@preview/mitex:0.2.4": *

// ─── Estado global de color principal ────────────────────────────────────────
#let color-principal = state("cp", rgb("#1e40af"))
#let color-claro     = state("cl", rgb("#dbeafe"))
#let color-acento    = state("ca", rgb("#3b82f6"))

// ─── Paleta por área ──────────────────────────────────────────────────────────
#let _paleta = (
  "Matematicas":       (pri: rgb("#1e40af"), light: rgb("#dbeafe"), acc: rgb("#3b82f6")),
  "Lenguaje":          (pri: rgb("#7c2d12"), light: rgb("#fef3c7"), acc: rgb("#d97706")),
  "Ciencias Naturales":(pri: rgb("#14532d"), light: rgb("#dcfce7"), acc: rgb("#16a34a")),
  "Ciencias Sociales": (pri: rgb("#1e3a5f"), light: rgb("#e0eaf5"), acc: rgb("#2563eb")),
  "Etica":             (pri: rgb("#4a1d96"), light: rgb("#ede9fe"), acc: rgb("#7c3aed")),
  "Artistica":         (pri: rgb("#831843"), light: rgb("#fce7f3"), acc: rgb("#db2777")),
)

// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTES REUTILIZADOS (idénticos a actividad.typ)
// ═══════════════════════════════════════════════════════════════════════════════

#let bloque-instrucciones(texto) = {
  if texto == "" or texto == none { return }
  context {
    let cp = color-principal.get()
    let cl = color-claro.get()
    block(
      width: 100%,
      fill: cl,
      radius: (right: 5pt),
      inset: (left: 14pt, top: 10pt, bottom: 10pt, right: 14pt),
      below: 1.5em,
      stroke: (left: 4pt + cp),
    )[
      #set text(size: 10pt, weight: "semibold", fill: cp)
      #texto
    ]
  }
}

#let recuadro(titulo: "", cuerpo) = {
  context {
    let cp = color-principal.get()
    let cl = color-claro.get()
    let ca = color-acento.get()
    block(
      width: 100%,
      fill: cl,
      radius: 5pt,
      inset: (left: 14pt, top: 10pt, bottom: 10pt, right: 14pt),
      below: 1em,
      stroke: 1.5pt + ca,
    )[
      #if titulo != "" [
        #set text(size: 8.5pt, weight: "bold", fill: cp)
        #upper(titulo)
        #v(0.3em)
      ]
      #set text(fill: rgb("#111827"))
      #cuerpo
    ]
  }
}

#let fragmento-lectura(cuerpo) = {
  context {
    let ca = color-acento.get()
    block(
      width: 100%,
      fill: rgb("#f8fafc"),
      inset: (left: 16pt, top: 12pt, bottom: 12pt, right: 16pt),
      below: 1em,
      stroke: (left: 3.5pt + ca),
    )[
      #set text(size: 10.5pt, style: "italic", fill: rgb("#374151"))
      #cuerpo
    ]
  }
}

#let tabla-formato(cols: 2, items) = {
  context {
    let cp = color-principal.get()
    block(below: 1.2em, width: 100%)[
      #table(
        columns: cols,
        stroke: 0.5pt + rgb("#d1d5db"),
        inset: (x: 10pt, y: 8pt),
        fill: (x, y) => if y == 0 { cp } else if calc.even(y) { rgb("#f9fafb") } else { white },
        ..items.enumerate().map(((i, item)) => {
          if int(i / cols) == 0 {
            [#set text(fill: white, weight: "bold", size: 10pt); #item]
          } else {
            [#set text(fill: rgb("#111827")); #item]
          }
        })
      )
    ]
  }
}

// ── Opción de selección múltiple ──────────────────────────────────────────────
#let opcion(letra, texto) = {
  context {
    let cp = color-principal.get()
    block(below: 0.4em)[
      #grid(
        columns: (16pt, 18pt, 1fr),
        gutter: 6pt,
        align: (center, center, left),
        [#set text(weight: "bold", fill: cp); #letra.],
        rect(
          width: 14pt, height: 14pt,
          stroke: 1.5pt + rgb("#6b7280"),
          radius: 2pt
        )[],
        [#set text(fill: rgb("#111827")); #texto],
      )
    ]
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HOJA DE RESPUESTAS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Burbuja individual (A B C D) ──────────────────────────────────────────────
#let _burbuja(letra, marcada: false, cp: rgb("#1e40af")) = {
  let fill-color = if marcada { cp } else { white }
  let text-color = if marcada { white } else { rgb("#374151") }
  box(
    width: 18pt,
    height: 18pt,
    fill: fill-color,
    stroke: 1.2pt + if marcada { cp } else { rgb("#9ca3af") },
    radius: 50%,
    inset: 0pt,
  )[
    #align(center + horizon)[
      #set text(size: 7.5pt, weight: "bold", fill: text-color)
      #letra
    ]
  ]
}

// ── Fila de una pregunta con 4 burbujas ───────────────────────────────────────
#let _fila-pregunta(num, clave: none, cp: rgb("#1e40af")) = {
  let respuesta = if clave != none { clave.at(str(num), default: none) } else { none }
  grid(
    columns: (18pt, 2pt, 18pt, 18pt, 18pt, 18pt),
    gutter: 3pt,
    align: (right + horizon, center, center, center, center, center),
    [#set text(size: 8pt, weight: "bold", fill: rgb("#374151")); #num],
    [],
    _burbuja("A", marcada: respuesta == "A", cp: cp),
    _burbuja("B", marcada: respuesta == "B", cp: cp),
    _burbuja("C", marcada: respuesta == "C", cp: cp),
    _burbuja("D", marcada: respuesta == "D", cp: cp),
  )
}

// ── Hoja de respuestas completa ───────────────────────────────────────────────
// n_preguntas: número total de preguntas (10–20)
// clave: dict {str(n): "A"|"B"|"C"|"D"} — si none, burbujas vacías (versión estudiante)
// titulo, area, grado, institucion: metadatos del encabezado
#let hoja-respuestas(
  n_preguntas: 20,
  clave: none,
  titulo: "",
  area: "",
  grado: "",
  institucion: "EduAgent",
) = {
  context {
    let cp = color-principal.get()
    let cl = color-claro.get()

    pagebreak()

    // ── Encabezado de la hoja ─────────────────────────────────────────────────
    block(below: 0.8em, width: 100%)[
      #block(
        width: 100%,
        fill: cp,
        radius: (top: 6pt),
        inset: (x: 16pt, y: 10pt),
      )[
        #align(center)[
          #set text(fill: white, weight: "bold", size: 11pt)
          HOJA DE RESPUESTAS
          #if clave != none [
            #text(size: 9pt, weight: "regular")[ — Clave del Docente]
          ]
        ]
      ]
      #block(
        width: 100%,
        fill: cl,
        radius: (bottom: 6pt),
        inset: (x: 16pt, y: 8pt),
        stroke: (bottom: 1pt + cp, left: 1pt + cp, right: 1pt + cp),
      )[
        #grid(
          columns: (1fr, 1fr),
          gutter: 12pt,
          align: (left, left),
          [#set text(size: 8pt, fill: rgb("#374151")); *ÁREA:* #area \ *GRADO:* #grado],
          [#set text(size: 8pt, fill: rgb("#374151")); *PRUEBA:* #titulo \ *INSTITUCIÓN:* #institucion],
        )
      ]
    ]

    // ── Campos de estudiante (solo en versión estudiante) ─────────────────────
    if clave == none [
      #v(0.6em)
      #block(width: 100%, below: 1em)[
        #grid(
          columns: (1fr, 160pt),
          gutter: 16pt,
          align: (left, left),
          [
            #set text(size: 8.5pt, weight: "bold", fill: rgb("#374151"))
            NOMBRE: #box(width: 1fr, stroke: (bottom: 0.8pt + rgb("#9ca3af")), inset: (bottom: 3pt))[]
          ],
          [
            #set text(size: 8.5pt, weight: "bold", fill: rgb("#374151"))
            FECHA: #box(width: 1fr, stroke: (bottom: 0.8pt + rgb("#9ca3af")), inset: (bottom: 3pt))[]
          ],
        )
      ]
    ]

    v(0.6em)

    // ── Leyenda de letras ─────────────────────────────────────────────────────
    block(below: 0.8em)[
      #grid(
        columns: (auto, 2pt, 18pt, 18pt, 18pt, 18pt),
        gutter: 3pt,
        align: (right + horizon, center, center, center, center, center),
        [#set text(size: 7pt, fill: rgb("#9ca3af")); N°],
        [],
        [#set text(size: 7pt, fill: rgb("#9ca3af")); A],
        [#set text(size: 7pt, fill: rgb("#9ca3af")); B],
        [#set text(size: 7pt, fill: rgb("#9ca3af")); C],
        [#set text(size: 7pt, fill: rgb("#9ca3af")); D],
      )
    ]

    // ── Preguntas en columnas ────────────────────────────────────────────────
    // Dividir las preguntas en columnas de hasta 10 ítems cada una
    let items-per-col = calc.ceil(n_preguntas / 3)
    // Si hay 10 o menos, usar 2 columnas (o 1 si son ≤6)
    let n_cols = if n_preguntas <= 6 { 1 } else if n_preguntas <= 12 { 2 } else { 3 }
    items-per-col = calc.ceil(n_preguntas / n_cols)

    let col_width = if n_cols == 1 { (120pt,) }
                    else if n_cols == 2 { (120pt, 120pt) }
                    else { (120pt, 120pt, 120pt) }

    grid(
      columns: col_width,
      gutter: 20pt,
      align: top,
      ..range(n_cols).map(col => {
        let start = col * items-per-col + 1
        let end = calc.min((col + 1) * items-per-col, n_preguntas)
        block[
          #for num in range(start, end + 1) {
            block(below: 5pt)[
              #_fila-pregunta(num, clave: clave, cp: cp)
            ]
          }
        ]
      })
    )

    // ── Pie ───────────────────────────────────────────────────────────────────
    v(1em)
    if clave == none [
      #block(
        width: 100%,
        fill: rgb("#f9fafb"),
        radius: 4pt,
        inset: (x: 12pt, y: 8pt),
        stroke: 0.5pt + rgb("#e5e7eb"),
      )[
        #set text(size: 8pt, fill: rgb("#6b7280"))
        #align(center)[
          *Instrucciones:* Rellena completamente la burbuja de la letra que corresponde a tu respuesta. \
          Usa lápiz o esfero. No hagas tachones. Una sola respuesta por pregunta.
        ]
      ]
    ] else [
      #block(
        width: 100%,
        fill: rgb("#fef3c7"),
        radius: 4pt,
        inset: (x: 12pt, y: 8pt),
        stroke: 0.5pt + rgb("#d97706"),
      )[
        #set text(size: 8pt, fill: rgb("#92400e"))
        #align(center)[
          🔑 *Uso exclusivo del docente* — Clave de respuestas. Total: #n_preguntas preguntas.
        ]
      ]
    ]
  }
}

// ── Sección de clave (docente) ────────────────────────────────────────────────
#let seccion-clave(cuerpo) = [
  #pagebreak()
  #block(
    fill: rgb("#7c3aed"),
    radius: 5pt,
    inset: (left: 14pt, top: 9pt, bottom: 9pt, right: 14pt),
    below: 1em,
    width: 100%,
  )[
    #set text(fill: white, weight: "bold", size: 10.5pt)
    🔑 Clave de Respuestas — Uso exclusivo del docente
  ]
  #set text(fill: rgb("#111827"))
  #cuerpo
]

// ═══════════════════════════════════════════════════════════════════════════════
//  FUNCIÓN PRINCIPAL: conf-prueba
// ═══════════════════════════════════════════════════════════════════════════════

#let conf-prueba(
  titulo: "",
  area: "General",
  grado: "",
  tema: "",
  instrucciones: none,
  n_preguntas: 20,
  clave: none,         // dict {"1": "A", ...} — none = versión estudiante
  institucion: "EduAgent",
  doc,
) = {
  // 1. Resolver paleta de colores
  let _colores = _paleta.at(area, default: (
    pri: rgb("#1e3a5f"), light: rgb("#e0eaf5"), acc: rgb("#2563eb")
  ))
  let cp = _colores.pri
  let cl = _colores.light
  let ca = _colores.acc

  // 2. Inyectar estado global de colores
  color-principal.update(cp)
  color-claro.update(cl)
  color-acento.update(ca)

  // 3. Configuración de página
  set page(
    paper: "us-letter",
    margin: (top: 2cm, bottom: 2cm, left: 2.5cm, right: 2.5cm),
    header: context {
      if counter(page).get().first() > 1 [
        #set text(size: 8pt, fill: rgb("#9ca3af"))
        #grid(
          columns: (1fr, 1fr),
          align: (left, right),
          [#titulo — Grado #grado],
          [EduAgent],
        )
        #line(length: 100%, stroke: 0.5pt + rgb("#e5e7eb"))
      ]
    },
    footer: context {
      set text(size: 8pt, fill: rgb("#9ca3af"))
      align(center)[Página #counter(page).display("1 de 1", both: true)]
    },
  )

  // 4. Tipografía base
  set text(
    font: ("Arial", "Liberation Sans", "Helvetica"),
    size: 10.5pt,
    lang: "es",
    fill: rgb("#111827"),
  )
  set par(leading: 0.7em, justify: false)

  // 5. Estilos de encabezados
  show heading.where(level: 1): it => block(above: 1.5em, below: 0.6em)[
    #set text(size: 12.5pt, weight: "bold", fill: cp)
    #upper(it.body)
    #v(-0.3em)
    #line(length: 100%, stroke: 2pt + cp)
  ]
  show heading.where(level: 2): it => block(above: 1.2em, below: 0.5em)[
    #set text(size: 11.5pt, weight: "bold", fill: cp)
    #it.body
    #v(-0.3em)
    #line(length: 100%, stroke: 1pt + ca)
  ]
  show heading.where(level: 3): it => block(above: 1.2em, below: 0.6em)[
    #set text(size: 11pt, weight: "bold", fill: cp)
    #it.body
    #v(-0.3em)
    #line(length: 100%, stroke: 0.7pt + cp)
  ]

  // 6. Encabezado del documento (datos del estudiante)
  block(below: 1.5em)[
    #table(
      columns: (15%, 35%, 15%, 35%),
      stroke: 0.8pt + rgb("#d1d5db"),
      inset: (x: 8pt, y: 7pt),
      fill: (x, y) => if y == 0 { cp } else { white },
      table.cell(colspan: 4, align: center)[
        #set text(size: 13pt, weight: "bold", fill: white)
        #upper(titulo)
      ],
      [#set text(fill: rgb("#374151"), weight: "bold", size: 9pt); ESTUDIANTE],
      [#box(width: 100%, stroke: (bottom: 0.6pt + rgb("#9ca3af")), inset: (bottom: 3pt))[]],
      [#set text(fill: rgb("#374151"), weight: "bold", size: 9pt); GRADO],
      [#set text(weight: "bold", size: 9pt); #grado],
      [#set text(fill: rgb("#374151"), weight: "bold", size: 9pt); FECHA],
      [#box(width: 100%, stroke: (bottom: 0.6pt + rgb("#9ca3af")), inset: (bottom: 3pt))[]],
      [#set text(fill: rgb("#374151"), weight: "bold", size: 9pt); ÁREA],
      [#set text(size: 9pt); #area],
      [#set text(fill: rgb("#374151"), weight: "bold", size: 9pt); TEMA],
      table.cell(colspan: 2)[#set text(size: 9pt); #tema],
      table.cell(align: center)[
        #set text(fill: rgb("#374151"), weight: "bold", size: 9pt)
        NOTA \ #v(0.2em)
        #rect(width: 100%, height: 1.1cm, stroke: 1.5pt + cp)
      ],
    )
  ]

  // 7. Bloque de instrucciones (si las hay)
  if instrucciones != none and instrucciones != "" {
    block(
      width: 100%,
      fill: cl,
      radius: (right: 5pt),
      inset: (left: 14pt, top: 10pt, bottom: 10pt, right: 14pt),
      below: 1.5em,
      stroke: (left: 4pt + cp),
    )[
      #set text(size: 10pt, weight: "semibold", fill: cp)
      #instrucciones
    ]
  }

  // 8. Contenido del documento (preguntas)
  doc

  // 9. Hoja de respuestas — versión ESTUDIANTE (burbujas vacías)
  hoja-respuestas(
    n_preguntas: n_preguntas,
    clave: none,
    titulo: titulo,
    area: area,
    grado: grado,
    institucion: institucion,
  )
}
