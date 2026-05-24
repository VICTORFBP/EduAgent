import mistune
import re

def markdown_to_html(text: str) -> str:
    # Proteger bloques LaTeX antes de que mistune los procese
    # Bloque: \[...\]
    placeholders = {}
    counter = [0]

    def protect(match):
        key = f"LATEX_BLOCK_{counter[0]}"
        placeholders[key] = match.group(0)
        counter[0] += 1
        return key

    text = re.sub(r'\\\[[\s\S]*?\\\]', protect, text)
    text = re.sub(r'\\\([\s\S]*?\\\)', protect, text)

    # Convertir Markdown a HTML
    html = mistune.html(text)

    # Restaurar bloques LaTeX inmediatamente
    for key, value in placeholders.items():
        html = html.replace(key, value)
        
    return html
