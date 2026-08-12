// ── EduAgent — Template de Actividad Educativa ──────────────────────────────
//
// Refactorizado con mejoras visuales premium.
// Exporta: conf, recuadro, fragmento-lectura, lineas-respuesta, grilla,
//          opcion, seccion-clave, bloque-instrucciones, dibujo, tabla-formato,
//          caja-respuesta, verdadero-falso
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
  "Ingles":            (pri: rgb("#0f766e"), light: rgb("#ccfbf1"), acc: rgb("#14b8a6")),
  "Tecnologia":        (pri: rgb("#0891b2"), light: rgb("#ecfeff"), acc: rgb("#06b6d4")),
  "Educacion Fisica":  (pri: rgb("#c2410c"), light: rgb("#ffedd5"), acc: rgb("#f97316")),
)


// ═══════════════════════════════════════════════════════════════════════════════
//  COMPONENTES EXPORTADOS
// ═══════════════════════════════════════════════════════════════════════════════

// ── Bloque de instrucciones ───────────────────────────────────────────────────
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

// ── Recuadro genérico (destacado, concepto) ───────────────────────────────────
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

// ── Fragmento de lectura ──────────────────────────────────────────────────────
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

// ── Líneas de respuesta manuscrita ────────────────────────────────────────────
#let lineas-respuesta(n: 3) = {
  block(below: 1em)[
    #for _ in range(n) {
      block(
        width: 100%,
        height: 1.6em,
        stroke: (bottom: 0.8pt + rgb("#9ca3af")),
        below: 0.5em,
      )[]
    }
  ]
}

// ── Grilla de ejercicios cortos (N columnas) ──────────────────────────────────
#let grilla(cols: 3, items) = {
  block(below: 1em)[
    #grid(
      columns: (1fr,) * cols,
      gutter: 8pt,
      ..items.map(item => block(
        stroke: 0.7pt + rgb("#d1d5db"),
        radius: 4pt,
        inset: 10pt,
        width: 100%,
      )[#align(center + horizon)[#item]])
    )
  ]
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

// ── Tabla con encabezado coloreado ────────────────────────────────────────────
#let tabla-formato(cols: 2, items) = {
  context {
    let cp = color-principal.get()
    block(below: 1.2em, width: 100%)[
      #table(
        columns: (1fr,) * cols,
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

// ── Tabla Verdadero / Falso ───────────────────────────────────────────────────
#let verdadero-falso(afirmaciones) = {
  context {
    let cp = color-principal.get()
    block(below: 1.2em, width: 100%)[
      #table(
        columns: (1fr, 30pt, 30pt),
        stroke: 0.5pt + rgb("#d1d5db"),
        inset: (x: 10pt, y: 9pt),
        fill: (x, y) => if y == 0 { cp } else if calc.even(y) { rgb("#f9fafb") } else { white },
        align: (left, center, center),
        [#set text(fill: white, weight: "bold"); Afirmación],
        [#set text(fill: white, weight: "bold"); V],
        [#set text(fill: white, weight: "bold"); F],
        ..afirmaciones.map(af => (
          [#set text(fill: rgb("#111827")); #af],
          rect(width: 16pt, height: 16pt, stroke: 0.8pt + rgb("#9ca3af"))[],
          rect(width: 16pt, height: 16pt, stroke: 0.8pt + rgb("#9ca3af"))[],
        )).flatten()
      )
    ]
  }
}

// ── Caja de respuesta abierta ─────────────────────────────────────────────────
#let caja-respuesta(titulo: "Escribe aquí tu respuesta:", altura: 2.5cm) = {
  context {
    let cp = color-principal.get()
    block(width: 100%, stroke: 1.5pt + cp, radius: 5pt, below: 1.5em, clip: true)[
      #block(width: 100%, fill: cp, inset: (x: 12pt, y: 7pt))[
        #set text(fill: white, weight: "bold", size: 9.5pt)
        #titulo
      ]
      #block(width: 100%, fill: white, height: altura, inset: 8pt)[]
    ]
  }
}

// ── Espacio de dibujo / esquema ───────────────────────────────────────────────
#let dibujo(instruccion) = {
  context {
    let ca = color-acento.get()
    block(stroke: 1.5pt + ca, radius: 5pt, width: 100%, below: 1em, clip: true)[
      #block(width: 100%, fill: ca.lighten(85%), inset: (x: 12pt, y: 7pt))[
        #set text(size: 9.5pt, weight: "semibold", fill: ca.darken(20%))
        ✏️ #instruccion
      ]
      #block(height: 6cm, width: 100%, fill: white)[]
    ]
  }
}

// ── Ejercicio de relacionar / emparejar columnas ──────────────────────────
#let relacion(titulo-izq: "Columna A", titulo-der: "Columna B", pares) = {
  context {
    let cp = color-principal.get()
    let cl = color-claro.get()
    let ca = color-acento.get()
    block(below: 1.2em, width: 100%)[
      #table(
        columns: (1fr, 40pt, 1fr),
        stroke: 0.5pt + rgb("#d1d5db"),
        inset: (x: 10pt, y: 9pt),
        fill: (x, y) => if y == 0 { cp } else if calc.even(y) { rgb("#f9fafb") } else { white },
        align: (left, center, left),
        [#set text(fill: white, weight: "bold"); #titulo-izq],
        [#set text(fill: white, weight: "bold"); ↔],
        [#set text(fill: white, weight: "bold"); #titulo-der],
        ..pares.map(par => (
          [#set text(fill: rgb("#111827")); #par.at(0)],
          [#set text(fill: ca, weight: "bold", size: 14pt); ·],
          [#set text(fill: rgb("#111827")); #par.at(1)],
        )).flatten()
      )
    ]
  }
}

// ── Texto con espacios para completar (Cloze) ────────────────────────────
#let completar-texto(cuerpo) = {
  context {
    let cp = color-principal.get()
    let cl = color-claro.get()
    block(
      width: 100%,
      fill: cl.lighten(40%),
      radius: 5pt,
      inset: (left: 14pt, top: 12pt, bottom: 12pt, right: 14pt),
      below: 1em,
      stroke: 1pt + cp.lighten(40%),
    )[
      #set text(size: 10.5pt, fill: rgb("#111827"))
      #block(below: 0.5em)[
        #set text(size: 8.5pt, weight: "bold", fill: cp)
        🧩 COMPLETA LOS ESPACIOS
      ]
      #cuerpo
    ]
  }
}

// ── Espacio inline para completar (punteado) ─────────────────────────────
#let espacio-completar() = {
  context {
    let cp = color-principal.get()
    box(
      width: 5em,
      stroke: (bottom: 1.5pt + cp.lighten(30%)),
      inset: (bottom: 2pt),
    )[]
  }
}

// ── Ejercicio de ordenar secuencia ────────────────────────────────────────
#let ordenar(instruccion: "Ordena los siguientes elementos:", items) = {
  context {
    let cp = color-principal.get()
    let ca = color-acento.get()
    block(below: 1.2em, width: 100%)[
      #block(below: 0.6em)[
        #set text(size: 10pt, weight: "semibold", fill: cp)
        📝 #instruccion
      ]
      #for (i, item) in items.enumerate() {
        block(below: 0.4em)[
          #grid(
            columns: (30pt, 1fr),
            gutter: 8pt,
            align: (center, left),
            rect(
              width: 24pt, height: 24pt,
              stroke: 1.5pt + ca,
              radius: 3pt,
              fill: white,
            )[],
            block(
              width: 100%,
              fill: if calc.even(i) { rgb("#f9fafb") } else { white },
              inset: (x: 10pt, y: 7pt),
              radius: 3pt,
              stroke: 0.5pt + rgb("#e5e7eb"),
            )[#set text(fill: rgb("#111827")); #item],
          )
        ]
      }
    ]
  }
}

// ── Texto para corregir errores ───────────────────────────────────────────
#let corregir-texto(cuerpo) = {
  context {
    block(
      width: 100%,
      fill: rgb("#fef2f2"),
      radius: 5pt,
      inset: (left: 14pt, top: 12pt, bottom: 12pt, right: 14pt),
      below: 1em,
      stroke: 1.5pt + rgb("#ef4444"),
    )[
      #block(below: 0.5em)[
        #set text(size: 8.5pt, weight: "bold", fill: rgb("#dc2626"))
        ✏️ ENCUENTRA Y CORRIGE LOS ERRORES
      ]
      #set text(size: 10.5pt, fill: rgb("#111827"))
      #cuerpo
    ]
  }
}

// ── Escala de valoración / Likert ─────────────────────────────────────────
#let escala(opciones, items) = {
  context {
    let cp = color-principal.get()
    let n-cols = opciones.len()
    block(below: 1.2em, width: 100%)[
      #table(
        columns: (1fr, ..(30pt,) * n-cols),
        stroke: 0.5pt + rgb("#d1d5db"),
        inset: (x: 8pt, y: 8pt),
        fill: (x, y) => if y == 0 { cp } else if calc.even(y) { rgb("#f9fafb") } else { white },
        align: (left, ..(center,) * n-cols),
        [#set text(fill: white, weight: "bold", size: 9pt); Ítem],
        ..opciones.map(op => [#set text(fill: white, weight: "bold", size: 8pt); #op]),
        ..items.map(item => (
          [#set text(fill: rgb("#111827"), size: 9.5pt); #item],
          ..range(n-cols).map(_ =>
            rect(width: 16pt, height: 16pt, stroke: 0.8pt + rgb("#9ca3af"))[]
          ),
        )).flatten()
      )
    ]
  }
}

// ── Sección de clave de respuestas (docente) ──────────────────────────────────
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
//  FUNCIÓN PRINCIPAL DE CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

#let conf(
  titulo: "",
  area: "General",
  grado: "",
  tema: "",
  instrucciones: none,
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
      [],
      [#set text(fill: rgb("#374151"), weight: "bold", size: 9pt); GRADO],
      [#set text(weight: "bold", size: 9pt); #grado],
      [#set text(fill: rgb("#374151"), weight: "bold", size: 9pt); FECHA],
      [],
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

  // 8. Contenido del documento
  doc
}
