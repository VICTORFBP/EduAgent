import re

def process(html: str) -> str:
    # Identificar tablas de completar (las que quedan con etiqueta <table> pura)
    html = re.sub(
        r'<table>',
        r'<table class="tabla-completar">',
        html
    )

    # Post-procesar tabla-completar para celdas vacías
    def completar_vacias(match):
        tabla_html = match.group(0)
        tabla_html = re.sub(r'<td[^>]*>\s*(?:&nbsp;|&#160;|\xa0)?\s*</td>', r'<td class="vacia"></td>', tabla_html)
        return tabla_html

    html = re.sub(r'<table class="tabla-completar">[\s\S]*?</table>', completar_vacias, html)

    # Si el LLM alucinó una tabla con clase incorrecta
    html = html.replace('class="taller-tabla"', 'class="tabla-completar"')
    html = html.replace('class="taller-celda-vacia"', 'class="vacia"')

    return html
