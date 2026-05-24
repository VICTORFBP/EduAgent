import re

def process(html: str) -> str:
    def generar_lineas(match):
        n = int(match.group(1))
        lineas = ''.join(['<div class="linea"></div>' * n])
        return f'<div class="lineas-respuesta">{lineas}</div>'

    html = re.sub(r'\[LINEAS:(\d+)\]', generar_lineas, html)

    # Identificar cajas de respuesta
    html = re.sub(
        r'<table>((?:(?!<table)[\s\S])*?<th[^>]*>(?:(?!</th>)[\s\S])*?Escribe(?:(?!</th>)[\s\S])*?</th>)',
        r'<table class="caja-respuesta">\1',
        html,
        flags=re.IGNORECASE
    )

    return html
