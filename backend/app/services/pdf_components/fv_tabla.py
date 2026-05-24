import re

def process(html: str) -> str:
    # Identificar tablas de Falso y Verdadero
    html = re.sub(
        r'<table>((?:(?!<table)[\s\S])*?<th[^>]*>\s*V\s*</th>\s*<th[^>]*>\s*F\s*</th>)',
        r'<table class="fv-tabla">\1',
        html,
        flags=re.IGNORECASE
    )

    # Post-procesar fv-tabla
    def fv_casillas(match):
        tabla_html = match.group(0)
        tabla_html = re.sub(r'<td[^>]*>\s*</td>', r'<td class="casilla"></td>', tabla_html)
        return tabla_html

    html = re.sub(r'<table class="fv-tabla">[\s\S]*?</table>', fv_casillas, html)

    return html
