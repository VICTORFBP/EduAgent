import mistune
import re

def markdown_to_html(text: str) -> str:
    # Proteger bloques LaTeX antes de que mistune los procese
    # Bloque: \[...\]
    placeholders = {}
    counter = [0]

    def protect(match):
        key = f"@@LATEX_BLOCK_{counter[0]}@@"
        placeholders[key] = match.group(0)
        counter[0] += 1
        return key

    # 1. Eliminar etiquetas <section> que el LLM alucina, para no romper el Markdown
    text = re.sub(r'</?section[^>]*>', '', text)

    # 1.5 Asegurar que los blockquotes (>) tengan una línea en blanco antes, 
    # de lo contrario Mistune los mezcla con el HTML o texto anterior.
    text = re.sub(r'(?m)^([^>\n].*)\n>', r'\1\n\n>', text)

    # 2. Convertir $...$ a \(...\) si el LLM ignoró la regla de no usar $
    text = re.sub(r'(?<![\$\\])\$([^$\n]+?)\$(?!\$)', lambda m: f'\\({m.group(1)}\\)', text)

    text = re.sub(r'\\\[[\s\S]*?\\\]', protect, text)
    text = re.sub(r'\\\([\s\S]*?\\\)', protect, text)

    # Convertir Markdown a HTML
    html = mistune.html(text)

    # Restaurar bloques LaTeX inmediatamente
    for key, value in placeholders.items():
        html = html.replace(key, value)
        
    return html
