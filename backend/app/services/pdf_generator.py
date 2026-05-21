"""EduAgent — PDF Generator Service via Playwright."""

import logging
from playwright.async_api import async_playwright
import os

logger = logging.getLogger(__name__)

# CSS para estilos del PDF consistentes con el frontend
CSS_STYLES = """
  body {
    font-family: Georgia, 'Times New Roman', serif;
    margin: 0;
    color: #111827;
    line-height: 1.6;
  }
  h1 {
    font-size: 22px;
    font-weight: bold;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 8px;
    margin-bottom: 16px;
    text-align: center;
  }
  h2 {
    font-size: 16px;
    font-weight: bold;
    margin-top: 20px;
    border-bottom: 1px solid #f3f4f6;
    padding-bottom: 4px;
  }
  h3 {
    font-size: 13px;
    font-weight: bold;
    margin-top: 14px;
  }
  p, li {
    font-size: 13.5px;
    color: #374151;
  }
  pre {
    background-color: #f3f4f6;
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    font-family: monospace;
    font-size: 12.5px;
    border: 1px solid #e5e7eb;
  }
  code {
    font-family: monospace;
    background-color: #f3f4f6;
    padding: 2px 4px;
    border-radius: 4px;
    font-size: 12.5px;
  }
  ul, ol {
    margin-left: 20px;
    margin-bottom: 12px;
  }
  li {
    margin-bottom: 4px;
  }
  .header-info {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 24px;
    border: 1px solid #e5e7eb;
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 24px;
    font-size: 12px;
  }
  .header-info .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .header-info label {
    font-weight: 600;
    color: #6b7280;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.02em;
  }
  .header-info .value {
    color: #111827;
    min-height: 1.25rem;
  }
  .header-info .blank {
    border-bottom: 1px solid #9ca3af;
    min-width: 140px;
    display: inline-block;
  }
  blockquote {
    border-left: 4px solid #d1d5db;
    padding-left: 12px;
    margin-left: 0;
    font-style: italic;
    color: #4b5563;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;
    page-break-inside: avoid;
  }
  th, td {
    border: 1px solid #9ca3af;
    padding: 12px;
    text-align: left;
    font-size: 13px;
    vertical-align: top;
  }
  th {
    background-color: #f3f4f6;
    font-weight: 600;
    color: #1f2937;
  }
  td {
    color: #374151;
    min-height: 80px;
  }
  tbody td:empty,
  tbody td:only-child:empty {
    min-height: 100px;
  }
  .instructions {
    font-style: italic;
    margin-bottom: 24px;
    font-size: 13.5px;
    color: #4b5563;
  }
  
  /* Taller classes */
  .actividad-taller { font-size: 14px; line-height: 1.55; color: #111827; }
  .taller-encabezado { width: 100%; border-collapse: collapse; margin-bottom: 1.25rem; font-size: 12px; }
  .taller-encabezado th, .taller-encabezado td { border: 1px solid #111; padding: 6px 8px; text-align: left; vertical-align: top; }
  .taller-section { margin-bottom: 1.75rem; page-break-inside: avoid; }
  .taller-titulo-seccion { font-size: 15px; font-weight: bold; text-transform: uppercase; text-decoration: underline; margin: 1.25rem 0 0.5rem; color: #111; }
  .taller-instruccion { margin: 0.5rem 0 0.75rem; font-size: 13.5px; color: #374151; }
  .taller-tabla { width: 100%; border-collapse: collapse; margin: 0.75rem 0 1rem; page-break-inside: avoid; }
  .taller-tabla th, .taller-tabla td { border: 1px solid #374151; padding: 10px 8px; text-align: left; vertical-align: top; min-height: 2.5rem; }
  .taller-tabla thead th { background: #fde68a; font-weight: 700; font-size: 12px; }
  .taller-tabla tbody td:empty, .taller-celda-vacia { min-height: 3rem; background: #fafafa; }
  .taller-grilla { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 0.75rem 0 1rem; }
  .taller-grilla-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin: 0.75rem 0 1rem; }
  .taller-grilla-item { border: 1px solid #9ca3af; padding: 12px 8px; min-height: 3.5rem; font-size: 13px; text-align: center; }
  .taller-espacio-respuesta { border: 1px solid #d1d5db; background: #f9fafb; padding: 8px 10px; margin: 0.5rem 0 0.75rem; font-size: 11px; color: #6b7280; font-style: italic; }
  .taller-lineas { border-bottom: 1px solid #9ca3af; min-height: 1.75rem; margin: 0.35rem 0; }
  
  /* Print overrides */
  @page { size: letter; margin: 2cm 2.5cm; }
"""

class PdfGeneratorService:
    """Generates PDF documents using Playwright (Chrome headless)."""

    def _build_html(self, actividad: dict, plan: dict, grado: int) -> str:
        titulo = actividad.get("titulo", "Actividad Evaluativa")
        instrucciones = actividad.get("instrucciones", "")
        
        # Get content for grade
        contenido_grados = actividad.get("contenido_grados", {})
        contenido = contenido_grados.get(str(grado), contenido_grados.get(grado, ""))

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>{titulo}</title>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
            <style>{CSS_STYLES}</style>
        </head>
        <body>
            <h1>{titulo}</h1>
            
            <div class="header-info">
                <div class="field">
                    <label>Estudiante</label>
                    <span class="value blank">&nbsp;</span>
                </div>
                <div class="field">
                    <label>Grado</label>
                    <span class="value">{grado}</span>
                </div>
                <div class="field">
                    <label>Fecha</label>
                    <span class="value blank">&nbsp;</span>
                </div>
                <div class="field">
                    <label>Área</label>
                    <span class="value">{plan.get('area', '')}</span>
                </div>
                <div class="field" style="grid-column: span 2;">
                    <label>Tema</label>
                    <span class="value">{plan.get('tema', '')}</span>
                </div>
            </div>

            {"<div class='instructions'>" + instrucciones + "</div>" if instrucciones else ""}
            
            <div class="actividad-taller">
                {contenido}
            </div>

            <script>
                document.addEventListener("DOMContentLoaded", function() {{
                    renderMathInElement(document.body, {{
                        delimiters: [
                            {{left: "$$", right: "$$", display: true}},
                            {{left: "$", right: "$", display: false}},
                            {{left: "\\\\(", right: "\\\\)", display: false}},
                            {{left: "\\\\[", right: "\\\\]", display: true}}
                        ],
                        throwOnError: false
                    }});
                }});
            </script>
        </body>
        </html>
        """
        return html

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
