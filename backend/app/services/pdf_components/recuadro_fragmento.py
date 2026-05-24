import re

def process(html: str) -> str:
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

    return html
