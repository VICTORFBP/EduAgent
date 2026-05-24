import re

def process(html: str) -> str:
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

    return html
