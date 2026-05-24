import re

def process(html: str) -> str:
    def procesar_grilla(match):
        # Limpiamos los saltos de línea y etiquetas <p> que mistune pueda haber generado dentro
        content = match.group(1)
        content = re.sub(r'</?p>', '\n', content)
        content = content.replace('<br>', '').replace('<br/>', '').replace('<br />', '')
        items_raw = content.strip().split('\n')
        items = ''.join([
            f'<div class="grilla-item">{item.strip()}</div>'
            for item in items_raw if item.strip()
        ])
        return f'<div class="grilla">{items}</div>'

    html = re.sub(
        r'<blockquote>\s*<p>🔢 GRILLA\s*([\s\S]*?)</p>\s*</blockquote>',
        procesar_grilla,
        html
    )

    return html
