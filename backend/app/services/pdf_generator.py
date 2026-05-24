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

        template_path = os.path.join(os.path.dirname(__file__), "pdf_components", "pdf_template.html")
        with open(template_path, "r", encoding="utf-8") as f:
            template = f.read()

        instrucciones_html = f'<div class="instrucciones-generales">{instrucciones}</div>' if instrucciones else ''

        html_final = template.format(
            titulo_raw=titulo_raw,
            css_styles=CSS_STYLES,
            area=area,
            grado=grado,
            tema=tema,
            instrucciones_html=instrucciones_html,
            contenido=contenido,
            clave_html=clave_html
        )

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
                page.on("console", lambda msg: logger.warning(f"JS Console: {msg.text}"))
                page.on("pageerror", lambda exc: logger.error(f"JS Error: {exc}"))
                page.set_content(html, wait_until="networkidle")
                
                # Wait an extra second for KaTeX to fully render
                page.wait_for_timeout(1000)
                
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
