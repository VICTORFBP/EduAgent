import re

def process(html: str) -> str:
    def procesar_grilla(match):
        # match.group(1) es el título opcional, group(2) es el contenido
        content = match.group(2)
        content = re.sub(r'</?p>', '\n', content)
        content = content.replace('<br>', '').replace('<br/>', '').replace('<br />', '')
        items_raw = content.strip().split('\n')
        items = ''.join([
            f'<div class="grilla-item">{item.strip()}</div>'
            for item in items_raw if item.strip()
        ])
        return f'<div class="grilla">{items}</div>'

    # Capturar HTML alucinado por el LLM si ignoró el Markdown
    html = html.replace('class="taller-grilla"', 'class="grilla"')
    html = html.replace('class="taller-grilla-item"', 'class="grilla-item"')

    html = re.sub(
        r'<blockquote>\s*<p>🔢\s*([^\n<]*?)(?:<br>|\n)?([\s\S]*?)</blockquote>',
        procesar_grilla,
        html
    )

    return html
