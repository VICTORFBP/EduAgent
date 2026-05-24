"""EduAgent — PDF Generator Service via Playwright."""

import logging
from playwright.async_api import async_playwright
import os

logger = logging.getLogger(__name__)

import mistune
import re

from .pdf_components import process_html, CSS_STYLES

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

        titulo       = process_html(titulo_raw)
        instrucciones = process_html(instrucciones_raw) if instrucciones_raw else ""
        contenido    = process_html(contenido_raw) if contenido_raw else ""
        clave        = process_html(clave_raw) if clave_raw else ""

        clave_html = f"<div class='page-break'></div><div class='seccion-clave'><div class='encabezado-clave'>Clave de Respuestas</div>{clave}</div>" if clave else ""

        html_final = f"""<!DOCTYPE html>
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
      <td width="15%"><span class="campo-label">ESTUDIANTE</span></td>
      <td width="35%"><span class="campo-valor">&nbsp;</span></td>
      <td width="15%"><span class="campo-label">GRADO</span></td>
      <td width="35%"><span class="campo-valor">{grado}</span></td>
    </tr>
    <tr>
      <td><span class="campo-label">FECHA</span></td>
      <td><span class="campo-valor">&nbsp;</span></td>
      <td><span class="campo-label">ÁREA</span></td>
      <td><span class="campo-valor">{area}</span></td>
    </tr>
    <tr>
      <td><span class="campo-label">TEMA</span></td>
      <td colspan="2"><span class="campo-valor">{tema}</span></td>
      <td class="nota-box">
        Nota<span class="nota-grande"></span>
      </td>
    </tr>
  </table>

  <!-- INSTRUCCIONES GENERALES -->
  {f'<div class="instrucciones-generales">{instrucciones}</div>' if instrucciones else ''}

  <!-- CONTENIDO DE LA ACTIVIDAD -->
  <div class="actividad-taller">
    {contenido}
  </div>

  <!-- CLAVE DE RESPUESTAS (Siempre al final, en nueva página) -->
  {clave_html}

  <script>
    document.addEventListener("DOMContentLoaded", function() {{
        renderMathInElement(document.body, {{
          delimiters: [
              {{left: '$$', right: '$$', display: true}},
              {{left: '$', right: '$', display: false}},
              {{left: '\\(', right: '\\)', display: false}},
              {{left: '\\[', right: '\\]', display: true}}
          ],
          throwOnError : false
        }});
    }});
  </script>
</body>
</html>"""

        with open("debug_html.html", "w", encoding="utf-8") as f:
            f.write(html_final)
            
        return html_final

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
