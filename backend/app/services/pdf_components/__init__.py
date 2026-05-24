import os

from . import base
from . import caja_respuesta
from . import fv_tabla
from . import grilla
from . import recuadro_fragmento
from . import seleccion_multiple
from . import tabla_completar

# Cargar el CSS global de componentes
STYLES_PATH = os.path.join(os.path.dirname(__file__), "styles.css")
with open(STYLES_PATH, "r", encoding="utf-8") as f:
    CSS_STYLES = f.read()

def process_html(text: str) -> str:
    """Convierte Markdown a HTML y procesa todos los componentes visuales."""
    # 1. Base (Proteger LaTeX y convertir Markdown)
    html = base.markdown_to_html(text)
    
    # 2. Pipeline de componentes (El orden importa para las tablas)
    html = caja_respuesta.process(html)
    html = recuadro_fragmento.process(html)
    html = grilla.process(html)
    html = seleccion_multiple.process(html)
    html = fv_tabla.process(html)
    
    # 3. Las tablas que queden sin clase se vuelven tablas de completar
    html = tabla_completar.process(html)
    
    return html
