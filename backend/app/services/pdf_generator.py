"""EduAgent — PDF Generator Service via Playwright."""

import logging
from playwright.async_api import async_playwright
import os

logger = logging.getLogger(__name__)

import mistune
import re

def md_to_html(text: str) -> str:
    # Proteger bloques LaTeX antes de que mistune los procese
    # Bloque: \[...\]
    placeholders = {}
    counter = [0]

    def protect(match):
        key = f"LATEX_BLOCK_{counter[0]}"
        placeholders[key] = match.group(0)
        counter[0] += 1
        return key

    text = re.sub(r'\\\[[\s\S]*?\\\]', protect, text)
    text = re.sub(r'\\\([\s\S]*?\\\)', protect, text)

    # Convertir Markdown a HTML
    html = mistune.html(text)

    # Restaurar bloques LaTeX inmediatamente
    for key, value in placeholders.items():
        html = html.replace(key, value)

    # Procesamiento de marcas especiales para componentes

    # Líneas manuscritas [LINEAS:N]
    def generar_lineas(match):
        n = int(match.group(1))
        lineas = ''.join(['<div class="linea"></div>' * n])
        return f'<div class="lineas-respuesta">{lineas}</div>'

    html = re.sub(r'\[LINEAS:(\d+)\]', generar_lineas, html)

    # Fragmento de lectura
    html = re.sub(
        r'<blockquote>\s*<p>📖 FRAGMENTO\s*([\s\S]*?)</p>\s*</blockquote>',
        lambda m: f'<div class="fragmento-lectura">{m.group(1).strip()}</div>',
        html
    )

    # Recuadro (permite etiquetas como RECUADRO, DIBUJO, ANÁLISIS, etc.)
    html = re.sub(
        r'<blockquote>\s*<p>📦\s*[A-ZÁÉÍÓÚÑ]+\s*([\s\S]*?)</p>\s*</blockquote>',
        lambda m: f'<div class="recuadro">{m.group(1).strip()}</div>',
        html
    )

    # Grilla de ejercicios
    def procesar_grilla(match):
        # Limpiamos los saltos de línea y etiquetas <p> que mistune pueda haber generado dentro
        content = match.group(1)
        content = re.sub(r'</?p>', '\n', content)
        content = content.replace('<br>', '').replace('<br/>', '').replace('<br />', '')
        items_raw = content.strip().split('\n')
        items = ''.join([
            f'<div class="grilla-item">{item.strip()}</div>'
            for item in items_raw if item.strip()
        ])
        return f'<div class="grilla">{items}</div>'

    html = re.sub(
        r'<blockquote>\s*<p>🔢 GRILLA\s*([\s\S]*?)</p>\s*</blockquote>',
        procesar_grilla,
        html
    )

    # Selección múltiple
    html = re.sub(
        r'([A-E]\.)\s*\[\s*\]\s*([^\n<]+)',
        r'<div class="opcion"><span class="letra">\1</span> <span class="casilla-sm"></span> \2</div>',
        html
    )
    html = re.sub(r'<br\s*/?>\s*(?=<div class="opcion">)', '', html)
    html = re.sub(r'(<div class="opcion">.*?</div>)\s*<br\s*/?>', r'\1', html)
    html = re.sub(
        r'((?:\s*<div class="opcion">.*?</div>)+)',
        r'\n<div class="seleccion-multiple">\1\n</div>',
        html
    )

    # Identificar tablas de Falso y Verdadero
    html = re.sub(
        r'<table>((?:(?!<table)[\s\S])*?<th[^>]*>\s*V\s*</th>\s*<th[^>]*>\s*F\s*</th>)',
        r'<table class="fv-tabla">\1',
        html,
        flags=re.IGNORECASE
    )

    # Identificar cajas de respuesta
    html = re.sub(
        r'<table>((?:(?!<table)[\s\S])*?<th[^>]*>[\s\S]*?Escribe[\s\S]*?</th>)',
        r'<table class="caja-respuesta">\1',
        html,
        flags=re.IGNORECASE
    )

    # Identificar tablas de completar (las que quedan)
    html = re.sub(
        r'<table>',
        r'<table class="tabla-completar">',
        html
    )

    # Post-procesar fv-tabla
    def fv_casillas(match):
        tabla_html = match.group(0)
        tabla_html = re.sub(r'<td[^>]*>\s*</td>', r'<td class="casilla"></td>', tabla_html)
        return tabla_html

    html = re.sub(r'<table class="fv-tabla">[\s\S]*?</table>', fv_casillas, html)

    # Post-procesar tabla-completar
    def completar_vacias(match):
        tabla_html = match.group(0)
        tabla_html = re.sub(r'<td[^>]*>\s*(?:&nbsp;|&#160;|\xa0)?\s*</td>', r'<td class="vacia"></td>', tabla_html)
        return tabla_html

    html = re.sub(r'<table class="tabla-completar">[\s\S]*?</table>', completar_vacias, html)

    return html

# CSS para estilos del PDF consistentes con el frontend
CSS_STYLES = """
/* ── Variables por área ── */
body[data-area="Matemáticas"]       { --cp:#1e40af; --cl:#dbeafe; --ca:#3b82f6; }
body[data-area="Lenguaje"]          { --cp:#7c2d12; --cl:#fef3c7; --ca:#d97706; }
body[data-area="Ciencias Naturales"]{ --cp:#14532d; --cl:#dcfce7; --ca:#22c55e; }
body[data-area="Ciencias Sociales"] { --cp:#1e3a5f; --cl:#e0eaf5; --ca:#2563eb; }
body[data-area="Ética"]             { --cp:#4a1d96; --cl:#ede9fe; --ca:#7c3aed; }
body[data-area="Artística"]         { --cp:#831843; --cl:#fce7f3; --ca:#db2777; }
body {
  --cp: #1e3a5f; --cl: #e0eaf5; --ca: #2563eb;
  font-family: 'Arial', sans-serif;
  font-size: 10.5pt;
  line-height: 1.6;
  color: #1a1a1a;
  margin: 0; padding: 0;
}

/* ── Encabezado institucional ── */
.encabezado-institucional {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 18px;
  border: 1.5px solid #333;
}
.encabezado-institucional td {
  border: 1px solid #333;
  padding: 5px 8px;
  font-size: 9pt;
  vertical-align: middle;
  height: auto;
}
.encabezado-institucional .titulo-doc {
  text-align: center;
  font-size: 13pt;
  font-weight: 700;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--cp);
  padding: 10px 8px;
  border-bottom: 2px solid var(--cp);
}
.encabezado-institucional .campo-label {
  font-weight: 700;
  font-size: 8pt;
  text-transform: uppercase;
  color: #555;
  white-space: nowrap;
}
.encabezado-institucional .campo-valor {
  border-bottom: 1px solid #999;
  min-width: 80px;
  display: inline-block;
  width: 100%;
}
.encabezado-institucional .nota-box {
  text-align: center;
  font-weight: 700;
  font-size: 9pt;
  color: var(--cp);
  width: 80px;
}
.nota-grande {
  display: block;
  border: 2px solid var(--cp);
  border-radius: 4px;
  height: 36px;
  margin-top: 4px;
}

/* ── Instrucciones generales ── */
.instrucciones-generales {
  background: var(--cl);
  border-left: 4px solid var(--cp);
  padding: 8px 14px;
  font-size: 9.5pt;
  border-radius: 0 4px 4px 0;
  margin-bottom: 18px;
}

/* ── Títulos de sección ── */
.actividad-taller h1 {
  font-size: 12pt; font-weight: 700;
  text-transform: uppercase;
  color: var(--cp);
  border-bottom: 2px solid var(--cp);
  padding-bottom: 3px;
  margin-top: 20px; margin-bottom: 10px;
  letter-spacing: .05em;
}
.actividad-taller h2 {
  font-size: 11pt; font-weight: 700;
  color: var(--cp);
  border-bottom: 1px solid var(--ca);
  padding-bottom: 2px;
  margin-top: 16px; margin-bottom: 8px;
}
.actividad-taller h3 {
  font-size: 10.5pt; font-weight: 700;
  color: #333;
  margin-top: 12px; margin-bottom: 6px;
}
p  { margin-bottom: 7px; }

/* ── Listas ── */
ol { padding-left: 20px; margin-bottom: 10px; }
ol li { margin-bottom: 12px; font-size: 10.5pt; }
ol li::marker { font-weight: 700; color: var(--cp); }
ul.opciones { list-style: none; padding: 0; margin: 4px 0 12px 16px; }
ul.opciones li { padding: 2px 0; font-size: 10.5pt; }
ul { list-style: none; padding: 0; margin: 4px 0 12px; }
ul li { padding: 2px 4px; font-size: 10.5pt; }

/* ── COMPONENTE: Caja de respuesta abierta ── */
.caja-respuesta {
  width: 100%;
  border-collapse: collapse;
  margin: 6px 0 16px;
  page-break-inside: avoid;
  border: 1.5px solid var(--ca);
}
.caja-respuesta th {
  background: var(--cl);
  color: var(--cp);
  font-family: sans-serif;
  font-size: 8.5pt;
  font-weight: 700;
  text-align: left;
  padding: 5px 10px;
  border-bottom: 1.5px solid var(--ca);
}
.caja-respuesta td {
  height: 80px;
  padding: 0;
}
.caja-respuesta.alta td { height: 130px; }
.caja-respuesta.media td { height: 80px; }
.caja-respuesta.baja td { height: 45px; }

/* ── COMPONENTE: Líneas para respuesta manuscrita ── */
.lineas-respuesta {
  margin: 6px 0 16px;
  page-break-inside: avoid;
}
.linea {
  border-bottom: 1px solid #999;
  height: 22px;
  margin-bottom: 2px;
  width: 100%;
}

/* ── COMPONENTE: Recuadro de fórmula o definición ── */
.recuadro {
  border: 1.5px solid var(--ca);
  border-radius: 4px;
  padding: 10px 16px;
  margin: 10px 0 16px;
  background: #fdfdfd;
  page-break-inside: avoid;
  white-space: pre-wrap;
  word-wrap: break-word;
}
.recuadro-titulo {
  font-family: sans-serif;
  font-size: 8.5pt;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--cp);
  margin-bottom: 6px;
  letter-spacing: .06em;
}

/* ── COMPONENTE: Tabla de completar ── */
.tabla-completar {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0 16px;
  font-size: 10pt;
  page-break-inside: avoid;
  border: 1px solid #bbb;
}
.tabla-completar th {
  background: var(--cp);
  color: white;
  font-family: sans-serif;
  font-size: 9pt;
  font-weight: 700;
  padding: 6px 10px;
  border: 1px solid #bbb;
  text-align: left;
}
.tabla-completar td {
  border: 1px solid #bbb;
  padding: 6px 10px;
  text-align: left;
  height: 30px;
}
.tabla-completar td.vacia {
  background: #fdfdfd;
  border-bottom: 1.5px solid var(--ca);
}

/* ── COMPONENTE: Grilla de ejercicios ── */
.grilla {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin: 8px 0 16px;
}
.grilla-2 { grid-template-columns: repeat(2, 1fr); }
.grilla-4 { grid-template-columns: repeat(4, 1fr); }
.grilla-item {
  border: 1px solid #ccc;
  border-radius: 4px;
  padding: 8px 10px;
  font-size: 10pt;
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.grilla-item .espacio {
  border-bottom: 1.5px solid var(--cp);
  min-width: 50px;
  display: inline-block;
}

/* ── COMPONENTE: Falso y Verdadero ── */
.fv-tabla {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0 16px;
  font-size: 10pt;
  border: 1px solid #bbb;
}
.fv-tabla th {
  background: var(--cp);
  color: white;
  font-family: sans-serif;
  font-size: 9pt;
  font-weight: 700;
  padding: 8px 10px;
  border: 1px solid #bbb;
  text-align: left;
}
.fv-tabla th:not(:first-child) {
  text-align: center;
  width: 40px;
}
.fv-tabla td {
  border: 1px solid #bbb;
  padding: 8px 10px;
  vertical-align: middle;
}
.fv-tabla tr:nth-child(even) td { background: #fafafa; }
.fv-tabla td.casilla {
  text-align: center;
  width: 40px;
  font-size: 14pt;
  color: #ccc;
}

/* ── COMPONENTE: Selección múltiple ── */
.seleccion-multiple { margin: 4px 0 14px 8px; }
.opcion { display: flex; align-items: flex-start; gap: 8px;
          margin-bottom: 5px; font-size: 10.5pt; }
.opcion .letra {
  font-weight: 700; color: var(--cp);
  min-width: 18px;
}
.casilla-sm {
  display: inline-block;
  width: 13px; height: 13px;
  border: 1.5px solid #555;
  border-radius: 2px;
  margin-right: 4px;
  vertical-align: middle;
}

/* ── COMPONENTE: Fragmento de lectura ── */
.fragmento-lectura {
  border-left: 3px solid var(--ca);
  padding: 10px 16px;
  margin: 10px 0 16px;
  font-style: italic;
  background: #fafafa;
  font-size: 10.5pt;
  line-height: 1.7;
}

/* ── KaTeX ── */
.katex { font-size: 1em !important; }
.katex-display { margin: 10px 0; overflow-x: auto; text-align: center; }

/* ── Clave docente ── */
.seccion-clave { padding: 0; margin-top: 20px; }
.encabezado-clave {
  background: #7c3aed; color: white;
  padding: 8px 14px; border-radius: 4px;
  font-family: sans-serif; font-weight: 700;
  font-size: 10pt; margin-bottom: 16px;
}

/* ── Página ── */
@page { margin: 18mm 15mm; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page-break { page-break-after: always; }
}
"""

class PdfGeneratorService:
    """Generates PDF documents using Playwright (Chrome headless)."""

    def _coerce_markdown(self, value) -> str:
        if value is None:
            return ""
        if isinstance(value, str):
            return value
        if isinstance(value, list):
            return "\n\n".join(self._coerce_markdown(item) for item in value if item)
        if isinstance(value, dict):
            import json
            return json.dumps(value, indent=2, ensure_ascii=False)
        return str(value)

    def _build_html(self, actividad: dict, plan: dict, grado: int) -> str:
        titulo_raw   = self._coerce_markdown(actividad.get("titulo", "Actividad Evaluativa"))
        instrucciones_raw = self._coerce_markdown(actividad.get("instrucciones", ""))
        contenido_grados  = actividad.get("contenido_grados", {})
        contenido_raw     = self._coerce_markdown(contenido_grados.get(str(grado),
                              contenido_grados.get(grado, "")))
        clave_raw    = self._coerce_markdown(actividad.get("clave_respuestas", ""))

        area  = plan.get("area", "")
        tema  = plan.get("tema", "")

        titulo       = md_to_html(titulo_raw)
        instrucciones = md_to_html(instrucciones_raw) if instrucciones_raw else ""
        contenido    = md_to_html(contenido_raw) if contenido_raw else ""
        clave        = md_to_html(clave_raw) if clave_raw else ""

        clave_html = f"<div class='page-break'></div><div class='seccion-clave'><div class='encabezado-clave'>Clave de Respuestas</div>{clave}</div>" if clave else ""

        return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>{titulo_raw}</title>
  <link rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css"/>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js">
  </script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js">
  </script>
  <style>{CSS_STYLES}</style>
</head>
<body data-area="{area}">

  <!-- ENCABEZADO INSTITUCIONAL -->
  <table class="encabezado-institucional">
    <tr>
      <td colspan="4" class="titulo-doc">{titulo_raw}</td>
    </tr>
    <tr>
      <td width="15%"><span class="campo-label">Estudiante</span></td>
      <td width="35%"><span class="campo-valor">&nbsp;</span></td>
      <td width="15%"><span class="campo-label">Grado</span></td>
      <td width="35%"><span class="campo-valor">{grado}</span></td>
    </tr>
    <tr>
      <td><span class="campo-label">Fecha</span></td>
      <td><span class="campo-valor">&nbsp;</span></td>
      <td><span class="campo-label">Área</span></td>
      <td><span class="campo-valor">{area}</span></td>
    </tr>
    <tr>
      <td><span class="campo-label">Tema</span></td>
      <td colspan="2"><span class="campo-valor">{tema}</span></td>
      <td class="nota-box">
        Nota<span class="nota-grande"></span>
      </td>
    </tr>
  </table>

  <!-- INSTRUCCIONES -->
  {"<div class='instrucciones-generales'>" + instrucciones + "</div>"
    if instrucciones else ""}

  <!-- CONTENIDO -->
  <div class="actividad-taller">
    {contenido}
  </div>

  <!-- CLAVE DOCENTE -->
  {clave_html}

  <script>
    document.addEventListener("DOMContentLoaded", function() {{
      renderMathInElement(document.body, {{
        delimiters: [
          {{left: "\\\\[", right: "\\\\]", display: true}},
          {{left: "\\\\(", right: "\\\\)", display: false}},
          {{left: "$$", right: "$$", display: true}},
          {{left: "$", right: "$", display: false}}
        ],
        throwOnError: false
      }});
    }});
  </script>
</body>
</html>"""

    async def generate_pdf(self, actividad: dict, plan: dict, grado: int) -> bytes:
        """Generates a PDF bytes object from the activity content."""
        html = self._build_html(actividad, plan, grado)
        import asyncio
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._generate_pdf_sync, html)

    def _generate_pdf_sync(self, html: str) -> bytes:
        from playwright.sync_api import sync_playwright
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.set_content(html, wait_until="networkidle")
                
                # Wait an extra second for KaTeX to fully render
                page.wait_for_timeout(500)
                
                pdf_bytes = page.pdf(
                    format="Letter",
                    margin={"top": "2cm", "bottom": "2cm", "left": "2.5cm", "right": "2.5cm"},
                    print_background=True,
                    display_header_footer=False
                )
                browser.close()
                return pdf_bytes
        except Exception as e:
            logger.error(f"Error generating PDF with Playwright: {e}")
            raise

pdf_generator_service = PdfGeneratorService()
