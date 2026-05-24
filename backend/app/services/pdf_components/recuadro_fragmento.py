import re

def process(html: str) -> str:
    # Fragmento de lectura
    html = re.sub(
        r'<blockquote>\s*<p>📖 FRAGMENTO\s*([\s\S]*?)</p>\s*</blockquote>',
        lambda m: f'<div class="fragmento-lectura">{m.group(1).strip()}</div>',
        html
    )

    # Recuadro DIBUJO específico
    html = re.sub(
        r'<blockquote>\s*<p>📦\s*DIBUJO\s*([\s\S]*?)</p>\s*</blockquote>',
        lambda m: f'<div class="caja-dibujo"><div class="caja-dibujo-instruccion">{m.group(1).strip()}</div><div class="espacio-dibujo"></div></div>',
        html,
        flags=re.IGNORECASE
    )

    # Recuadro normal (permite etiquetas como RECUADRO, ANÁLISIS, etc.)
    html = re.sub(
        r'<blockquote>\s*<p>📦\s*[A-ZÁÉÍÓÚÑ]+\s*([\s\S]*?)</p>\s*</blockquote>',
        lambda m: f'<div class="recuadro">{m.group(1).strip()}</div>',
        html
    )

    # Si hay lineas-respuesta inmediatamente después de una caja-dibujo, las eliminamos
    html = re.sub(
        r'(<div class="caja-dibujo">[\s\S]*?</div>)\s*(?:<p>\s*)?<div class="lineas-respuesta">[\s\S]*?</div>(?:</p>)?',
        r'\1',
        html
    )

    return html
