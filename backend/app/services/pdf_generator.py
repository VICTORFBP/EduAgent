"""EduAgent -- PDF Generator via Typst.

Pipeline:
  actividad dict  ->  Typst markup string  ->  main.typ (imports template)
  ->  typst.compile()  ->  PDF bytes

El Markdown generado por el LLM se convierte a Typst usando un renderizador
personalizado de `mistune` (AST-based), evitando regex fragiles.
"""
from __future__ import annotations

import logging
import os
import re
import asyncio
import uuid
from typing import Any, List

import mistune

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Area normalization map
# ---------------------------------------------------------------------------

_AREA_KEY_MAP = {
    "matematicas":       "Matematicas",
    "matem\u00e1ticas":  "Matematicas",
    "lenguaje":          "Lenguaje",
    "castellano":        "Lenguaje",
    "ciencias naturales":"Ciencias Naturales",
    "ciencias sociales": "Ciencias Sociales",
    "etica":             "Etica",
    "\u00e9tica":         "Etica",
    "artistica":         "Artistica",
    "art\u00edstica":     "Artistica",
    "ingles":            "Ingles",
    "ingl\u00e9s":        "Ingles",
    "tecnologia":        "Tecnologia",
    "tecnolog\u00eda":    "Tecnologia",
    "tecnologia e informatica": "Tecnologia",
    "tecnolog\u00eda e inform\u00e1tica": "Tecnologia",
    "educacion fisica":  "Educacion Fisica",
    "educaci\u00f3n f\u00edsica": "Educacion Fisica",
}


def _normalize_area(area: str) -> str:
    return _AREA_KEY_MAP.get(area.strip().lower(), area)


# ---------------------------------------------------------------------------
# Typst escape helpers
# ---------------------------------------------------------------------------

# Typst characters that break compilation if unescaped in plain text:
# < and > open/close Typst label/ref syntax -> unclosed delimiter errors
# @ triggers bibliography/reference links
_TYPST_PLAIN_SPECIAL = re.compile(r'([<>@])')

# Characters special inside Typst string arguments (quoted strings)
_TYPST_STR_SPECIAL = re.compile(r'(["\\])')


def _escape_plain_text(text: str) -> str:
    """Escape characters that cause parse errors in Typst plain content.
    Escapes: \\ < > @ _ # *
    """
    if not text:
        return ""
    # 1. Unescape Markdown backslash escapes (e.g., \\# -> #)
    text = re.sub(r'\\([!"#$%&\'()*+,\-./:;<=>?@[\\\]^_`{|}~])', r'\1', text)
    # 2. Escape Typst special characters:
    # First escape \\ to \\\\
    text = text.replace('\\', '\\\\')
    # Then escape the rest
    text = re.sub(r'([<>@_#*])', r'\\\1', text)
    return text


def _escape_str_arg(s: str) -> str:
    """Escape a string for use as a Typst string argument (inside double quotes)."""
    return s.replace('\\', '\\\\').replace('"', '\\"')


def _coerce_str(value: Any) -> str:
    """Normalize any value to string."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "\n\n".join(_coerce_str(i) for i in value if i)
    if isinstance(value, dict):
        if not value:
            return ""
        lines = ["### Clave de Respuestas\n"]
        for k, v in value.items():
            key_label = f"Pregunta {k}" if str(k).isdigit() else str(k)
            if isinstance(v, dict):
                lines.append(f"- **{key_label}:**")
                for sub_k, sub_v in v.items():
                    lines.append(f"  - {sub_k}: **{sub_v}**")
            else:
                lines.append(f"- **{key_label}:** {v}")
        return "\n".join(lines)
    return str(value)


# ---------------------------------------------------------------------------
# Math extraction (protect LaTeX blocks before Markdown parsing)
# ---------------------------------------------------------------------------

_MATH_PLACEHOLDER_RE = re.compile(r'\x00MATH(\d+)\x00')


def _extract_math(text: str) -> tuple:
    """
    Replace LaTeX math blocks with placeholders so mistune doesn't touch them.
    Returns (modified_text, math_map).
    """
    math_map: dict = {}
    counter = [0]

    # Normalize \[...\] and \(...\) produced by LLM
    text = re.sub(r'\\\[(.+?)\\\]', r'$$\1$$', text, flags=re.DOTALL)
    text = re.sub(r'\\\((.+?)\\\)', r'$\1$', text, flags=re.DOTALL)

    # Convert bare powers like 3^2, x^2 to inline math if not already wrapped
    text = re.sub(r'(?<![$])\b([A-Za-z0-9]+)\^([A-Za-z0-9]+)\b(?![$])', r'$\1^\2$', text)

    def _store(content: str, block: bool) -> str:
        k = f'\x00MATH{counter[0]}\x00'
        counter[0] += 1
        esc = content.replace('\\', '\\\\').replace('"', '\\"')
        math_map[k] = f'#mitex("{esc}")' if block else f'#mi("{esc}")'
        return k

    def _block(m: re.Match) -> str:
        return _store(m.group(1).strip(), block=True)

    def _inline(m: re.Match) -> str:
        return _store(m.group(1).strip(), block=False)

    text = re.sub(r'\$\$([\s\S]*?)\$\$', _block, text)
    text = re.sub(r'\$([^$\n]+?)\$', _inline, text)
    return text, math_map


def _restore_math(text: str, math_map: dict) -> str:
    for k, v in math_map.items():
        text = text.replace(k, v)
    return text


# ---------------------------------------------------------------------------
# Pre-processing of special markers
# ---------------------------------------------------------------------------

def _preprocess_special_marks(text: str) -> str:
    """
    Convert LLM special markers to placeholders:
      [LINEAS:N]            -> \x00LINEAS:N\x00
      ___ (4+ underscores)  -> \x00LINEAS:1\x00  (blank-fill lines)
      A. [ ] option text    -> \x00OPCION:A:option text\x00  (canonical)
      A. text / A) text     -> \x00OPCION:A:text\x00  (fallback, no casilla)
      Afirmación V F block  -> proper Markdown V/F table (fallback)
    """
    # [LINEAS:N]
    text = re.sub(
        r'\[LINEAS:(\d+)\]',
        lambda m: f'\x00LINEAS:{m.group(1)}\x00',
        text
    )
    # 4+ underscores on their own line -> Espacio para resolver
    text = re.sub(
        r'(?m)^_{4,}$',
        '\x00CAJA:1\x00',
        text
    )
    # 4+ underscores inline -> fill-in-the-blank lines
    text = re.sub(
        r'_{4,}',
        '\x00LINEAS:1\x00',
        text
    )

    def _opcion(m: re.Match) -> str:
        letra = m.group(1).upper()
        contenido = m.group(2).strip()
        return f'\x00OPCION:{letra}:{contenido}\x00'

    # Primary: "A. [ ] texto" or "A) [ ] texto" (canonical with checkbox)
    text = re.sub(
        r'^\s*([A-Ea-e])[.)]\s*\[\s*\]\s*(.+)$',
        _opcion,
        text,
        flags=re.MULTILINE,
    )
    # Fallback: "A. texto" or "A) texto" without checkbox
    # Only matches if NOT already converted (no \x00 on that line)
    text = re.sub(
        r'^\s*([A-Ea-e])[.)]\ +(?![\[\x00])(.+)$',
        _opcion,
        text,
        flags=re.MULTILINE,
    )

    # Fallback: some LLMs output V/F as plain text like:
    text = _convert_vf_plaintext_to_table(text)

    # (Moved <SALTO> replacement to _markdown_to_typst to avoid HTML stripping)

    return text


def _convert_vf_plaintext_to_table(text: str) -> str:
    """
    Fallback: some LLMs output V/F as plain text like:

      Afirmación V F
      El sol es una estrella.
      La luna es un planeta.

    This converts it to a proper Markdown table:

      | Afirmación | V | F |
      |:-----------|:-:|:-:|
      | El sol es una estrella. | | |
      ...

    Only fires when there is NO existing Markdown table with V/F header.
    """
    lines = text.split('\n')
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Detect header line: "Afirmación V F" or "Afirmacion V F" (with optional spaces)
        header_match = re.match(
            r'^\s*[Aa]firmaci[oó]n\s+V\s+F\s*$',
            line.strip()
        )
        if header_match:
            # Check we are not inside a Markdown table already
            prev_lines = '\n'.join(result[-3:])
            if '|' not in prev_lines:
                # Collect following non-empty, non-table lines as statements
                stmts = []
                j = i + 1
                while j < len(lines):
                    stmt = lines[j].strip()
                    if stmt == '' or stmt.startswith('|') or stmt.startswith('#'):
                        break
                    # Skip separator-only lines
                    if re.match(r'^[-|:\s]+$', stmt):
                        j += 1
                        continue
                    stmts.append(stmt)
                    j += 1
                if stmts:
                    # Emit proper MD table
                    result.append('| Afirmación | V | F |')
                    result.append('|:-----------|:-:|:-:|')
                    for stmt in stmts:
                        result.append(f'| {stmt} | | |')
                    i = j
                    continue
        result.append(line)
        i += 1
    return '\n'.join(result)


# ---------------------------------------------------------------------------
# TypstRenderer: mistune BaseRenderer -> Typst markup
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Post-processing: clean up Typst output artifacts from bad LLM Markdown
# ---------------------------------------------------------------------------

def _postprocess_typst(text: str) -> str:
    """
    Clean up common artifacts that appear when the LLM generates malformed Markdown:

    1. Lines that are just pipe chars (broken table remnants): "  |", " | "
    2. More than 2 consecutive blank lines -> 2 blank lines max
    3. Lines with only whitespace inside broken table cells
    """
    lines = text.split('\n')
    cleaned = []
    blank_count = 0

    for line in lines:
        stripped = line.strip()

        # Remove lines that are just pipe chars (broken table remnants)
        if re.match(r'^\|[\s|]*$', stripped) and stripped:
            continue

        # Collapse excessive blank lines (max 2 consecutive)
        if stripped == '':
            blank_count += 1
            if blank_count <= 2:
                cleaned.append(line)
        else:
            blank_count = 0
            cleaned.append(line)

    return '\n'.join(cleaned)


class TypstRenderer(mistune.BaseRenderer):

    """Renders mistune AST tokens to Typst code."""

    NAME = "typst"

    # -- Inline tokens -------------------------------------------------------

    def text(self, token: dict, state) -> str:
        raw = token.get("raw", "")
        return self._process_raw(raw)

    def _process_raw(self, raw: str) -> str:
        parts = _MATH_PLACEHOLDER_RE.split(raw)
        out = []
        for i, part in enumerate(parts):
            if i % 2 == 0:
                out.append(self._inline_placeholders(part))
            else:
                out.append(f'\x00MATH{part}\x00')
        return "".join(out)

    def _inline_placeholders(self, text: str) -> str:
        # Split on special placeholders, escape plain segments between them
        result_parts = []
        # Process CAJA placeholders
        text = re.sub(
            r'\x00CAJA:(\d+)\x00',
            lambda m: f'\n#caja-respuesta(titulo: "Espacio para resolver:", altura: 3cm)\n',
            text
        )
        # Process LINEAS placeholders
        text = re.sub(
            r'\x00LINEAS:(\d+)\x00',
            lambda m: f'\n#lineas-respuesta(n: {m.group(1)})\n',
            text
        )
        # Process OPCION placeholders (option letter + content)
        text = re.sub(
            r'\x00OPCION:([A-E]):(.+?)\x00',
            lambda m: f'\n#opcion("{m.group(1)}", [{_escape_plain_text(m.group(2))}])\n',
            text
        )
        # Escape plain text segments (< > @ # *) — but NOT inside #macro(...) calls we just injected
        parts = re.split(r'(#(?:caja-respuesta|lineas-respuesta|opcion)[^\n]*)', text)
        escaped = []
        for i, part in enumerate(parts):
            if i % 2 == 0:
                # Plain text segment — escape dangerous chars
                escaped.append(_escape_plain_text(part))
            else:
                # Typst macro — leave untouched
                escaped.append(part)
        return ''.join(escaped)

    def strong(self, token: dict, state) -> str:
        return f"*{self.render_children(token, state)}*"

    def emphasis(self, token: dict, state) -> str:
        return f"_{self.render_children(token, state)}_"

    def codespan(self, token: dict, state) -> str:
        return f'`{token.get("raw", "")}`'

    def linebreak(self, token: dict, state) -> str:
        return "\n"

    def softbreak(self, token: dict, state) -> str:
        return "\n"

    def blank_line(self, token: dict, state) -> str:
        return "\n"

    def inline_html(self, token: dict, state) -> str:
        return ""

    def link(self, token: dict, state) -> str:
        url = token.get("attrs", {}).get("url", "")
        return f'#link("{_escape_str_arg(url)}")[{self.render_children(token, state)}]'

    def image(self, token: dict, state) -> str:
        return ""

    # -- Block tokens --------------------------------------------------------

    def paragraph(self, token: dict, state) -> str:
        return self.render_children(token, state).strip() + "\n\n"

    def block_text(self, token: dict, state) -> str:
        """Used inside list_item in tight lists."""
        return self.render_children(token, state).strip()

    def heading(self, token: dict, state) -> str:
        level = token.get("attrs", {}).get("level", 2)
        marks = "=" * level
        return f"{marks} {self.render_children(token, state)}\n\n"

    def thematic_break(self, token: dict, state) -> str:
        return "\n"

    def block_code(self, token: dict, state) -> str:
        code = token.get("raw", "")
        return f'```\n{code}\n```\n\n'

    def block_html(self, token: dict, state) -> str:
        return ""

    def block_quote(self, token: dict, state) -> str:
        """
        Detects blockquote type from first line keyword or emoji:
          FRAGMENTO / U+1F4D6 -> #fragmento-lectura
          DIBUJO    / U+1F3A8 -> #dibujo
          GRILLA              -> #grilla
          RECUADRO  / U+1F4E6 -> #recuadro
          other               -> generic #recuadro
        """
        raw_lines = self._collect_blockquote_lines(token)
        if not raw_lines:
            return ""

        first = raw_lines[0].strip()
        rest_lines = raw_lines[1:]
        rest_text = "\n".join(l.strip() for l in rest_lines if l.strip())
        first_upper = first.upper()

        if 'FRAGMENTO' in first_upper or '\U0001f4d6' in first:
            body_first = re.sub(
                r'(?i)^[\U0001f4d6\s]*FRAGMENTO\s*[:\-]?\s*', '', first
            ).strip()
            inner = "\n".join(p for p in [body_first, rest_text] if p)
            return f'#fragmento-lectura[\n{inner}\n]\n\n'

        if 'DIBUJO' in first_upper or 'ESQUEMA' in first_upper or '\U0001f3a8' in first:
            instruccion = re.sub(
                r'(?i)^[\U0001f3a8\s]*(DIBUJO|ESQUEMA)\s*[:\-]?\s*', '', first
            ).strip()
            if rest_text:
                instruccion = (instruccion + ' ' + rest_text).strip()
            return f'#dibujo[{instruccion}]\n\n'

        if 'GRILLA' in first_upper:
            items = [l.strip() for l in rest_lines if l.strip()]
            if items:
                items_typst = ',\n  '.join(f'[{_escape_plain_text(i)}]' for i in items)
                return f'#grilla(cols: 3, (\n  {items_typst},\n))\n\n'



        if 'RELACION' in first_upper or '\U0001f4cb' in first:
            titulo_rel = re.sub(
                r'(?i)^[\U0001f4cb\s]*RELACION\s*[:\-]?\s*', '', first
            ).strip()
            # First line of rest = column titles separated by ↔
            col_titles = ['Columna A', 'Columna B']
            data_lines = rest_lines
            if rest_lines and '↔' in rest_lines[0]:
                parts = rest_lines[0].split('↔')
                col_titles = [p.strip() for p in parts[:2]]
                data_lines = rest_lines[1:]
            pares = []
            for ln in data_lines:
                ln = ln.strip()
                if not ln:
                    continue
                if '|' in ln:
                    pair_parts = ln.split('|', 1)
                    pares.append((
                        f'[{_escape_plain_text(pair_parts[0].strip())}]',
                        f'[{_escape_plain_text(pair_parts[1].strip())}]'
                    ))
                else:
                    pares.append((f'[{_escape_plain_text(ln)}]', '[]'))
            pares_typst = ',\n  '.join(f'({p[0]}, {p[1]})' for p in pares)
            return (
                f'#relacion('
                f'titulo-izq: [{col_titles[0]}], '
                f'titulo-der: [{col_titles[1]}], '
                f'(\n  {pares_typst},\n))\n\n'
            )

        if 'COMPLETAR' in first_upper or '\U0001f9e9' in first:
            body_first = re.sub(
                r'(?i)^[\U0001f9e9\s]*COMPLETAR\s*[:\-]?\s*', '', first
            ).strip()
            inner = "\n".join(p for p in [body_first, rest_text] if p)
            return f'#completar-texto[\n{inner}\n]\n\n'

        if 'ORDENAR' in first_upper or '\U0001f4dd' in first:
            instruccion = re.sub(
                r'(?i)^[\U0001f4dd\s]*ORDENAR\s*[:\-]?\s*', '', first
            ).strip()
            data_lines_ord = rest_lines
            if instruccion:
                # instruccion is the title, rest are items
                pass
            elif rest_lines:
                instruccion = rest_lines[0].strip()
                data_lines_ord = rest_lines[1:]
            items_ord = [l.strip() for l in data_lines_ord if l.strip()]
            if items_ord:
                items_typst = ',\n  '.join(f'[{_escape_plain_text(i)}]' for i in items_ord)
                instr_esc = instruccion or 'Ordena los siguientes elementos:'
                return (
                    f'#ordenar(instruccion: [{instr_esc}], '
                    f'(\n  {items_typst},\n))\n\n'
                )

        if 'CORREGIR' in first_upper or ('✏' in first and 'CORREGIR' in first_upper):
            body_first = re.sub(
                r'(?i)^[✏️\s]*CORREGIR\s*[:\-]?\s*', '', first
            ).strip()
            inner = "\n".join(p for p in [body_first, rest_text] if p)
            return f'#corregir-texto[\n{inner}\n]\n\n'

        if 'ESCALA' in first_upper or '\U0001f522' in first:
            # First rest line = scale options separated by |
            opciones = ['Sí', 'No']
            data_lines_esc = rest_lines
            if rest_lines and '|' in rest_lines[0]:
                opciones = [o.strip() for o in rest_lines[0].split('|') if o.strip()]
                data_lines_esc = rest_lines[1:]
            items_esc = [l.strip() for l in data_lines_esc if l.strip()]
            if items_esc:
                ops_typst = ', '.join(f'[{_escape_plain_text(o)}]' for o in opciones)
                items_typst = ',\n  '.join(f'[{_escape_plain_text(i)}]' for i in items_esc)
                return (
                    f'#escala(\n  ({ops_typst},),\n'
                    f'  ({items_typst},),\n)\n\n'
                )

        if 'RECUADRO' in first_upper or '\U0001f4e6' in first or '\U0001f4cc' in first:
            titulo_bq = re.sub(
                r'(?i)^[\U0001f4e6\U0001f4cc\s]*(RECUADRO)\s*[:\-]?\s*', '', first
            ).strip()
            if titulo_bq:
                return f'#recuadro(titulo: [{titulo_bq}])[\n{rest_text}\n]\n\n'
            return f'#recuadro[\n{rest_text}\n]\n\n'

        # Generic blockquote
        full = "\n".join(raw_lines)
        return f'#recuadro[\n{full}\n]\n\n'

    def _collect_blockquote_lines(self, token: dict) -> List[str]:
        """
        Extract text lines from a blockquote.
        mistune puts all blockquote content in paragraphs with softbreaks.
        """
        lines: List[str] = []
        for child in token.get("children", []):
            if child["type"] == "paragraph":
                seg: List[str] = []
                for inline in child.get("children", []):
                    t = inline["type"]
                    if t == "text":
                        seg.append(self._process_raw(inline.get("raw", "")))
                    elif t in ("softbreak", "linebreak"):
                        lines.append("".join(seg))
                        seg = []
                    elif t == "strong":
                        inner = "".join(
                            self._process_raw(n.get("raw", "")) for n in inline.get("children", [])
                            if n["type"] == "text"
                        )
                        seg.append(f"*{inner}*")
                    elif t == "emphasis":
                        inner = "".join(
                            self._process_raw(n.get("raw", "")) for n in inline.get("children", [])
                            if n["type"] == "text"
                        )
                        seg.append(f"_{inner}_")
                if seg:
                    lines.append("".join(seg))
        return lines

    def list(self, token: dict, state) -> str:
        ordered = token.get("attrs", {}).get("ordered", False)
        items_out = []
        num = 1
        for child in token.get("children", []):
            if child["type"] == "list_item":
                content = self.render_children(child, state).strip()
                if ordered:
                    items_out.append(f"*{num}.* {content}\n")
                    num += 1
                else:
                    items_out.append(f"- {content}\n")
        return "\n".join(items_out) + "\n"

    def list_item(self, token: dict, state) -> str:
        return self.render_children(token, state).strip()

    # -- Table tokens --------------------------------------------------------
    # mistune AST structure:
    #   table -> [table_head, table_body]
    #   table_head -> [table_cell (head=True), ...]
    #   table_body -> [table_row, ...]
    #   table_row  -> [table_cell (head=False), ...]

    def table(self, token: dict, state) -> str:
        children = token.get("children", [])
        thead = next((c for c in children if c["type"] == "table_head"), None)
        tbody = next((c for c in children if c["type"] == "table_body"), None)

        head_cells = self._extract_cells(thead, state) if thead else []

        # Detect Verdadero/Falso pattern (accept accent variations)
        if (
            len(head_cells) == 3
            and head_cells[0].strip().lower().replace("ó", "o") in ("afirmacion",)
            and head_cells[1].strip().upper() in ("V", "VERDADERO")
            and head_cells[2].strip().upper() in ("F", "FALSO")
        ):
            return self._render_verdadero_falso(tbody, state)

        return self._render_tabla_generica(head_cells, tbody, state)

    def table_head(self, token: dict, state) -> str:
        return ""  # Handled in table()

    def table_body(self, token: dict, state) -> str:
        return ""  # Handled in table()

    def table_row(self, token: dict, state) -> str:
        return ""  # Handled in table()

    def table_cell(self, token: dict, state) -> str:
        return self.render_children(token, state).strip()

    def _extract_cells(self, row_or_head: dict, state) -> List[str]:
        """Extract text from table_cell children of a table_head or table_row."""
        cells = []
        for child in row_or_head.get("children", []):
            if child["type"] == "table_cell":
                cells.append(self.render_children(child, state).strip())
        return cells

    def _render_verdadero_falso(self, tbody, state) -> str:
        items = []
        if tbody:
            for row in tbody.get("children", []):
                if row["type"] == "table_row":
                    cells = self._extract_cells(row, state)
                    if cells and cells[0].strip():
                        items.append(f'  [{cells[0].strip()}]')
        items_str = ',\n'.join(items)
        if items_str:
            items_str += ','
        return f'#verdadero-falso((\n{items_str}\n))\n\n'

    def _render_tabla_generica(self, head_cells: List[str], tbody, state) -> str:
        cols = len(head_cells)

        # Detect single-column "response box" table (common LLM pattern):
        # | Escribe aqui tu respuesta: |
        # |:---|
        # | &nbsp;<br>... |
        if cols == 1 and head_cells:
            header_lower = head_cells[0].strip().lower()
            RESPONSE_KEYWORDS = (
                "escribe aqu", "argumenta", "justifica", "procedimiento",
                "respuesta", "escribe tu", "desarrolla"
            )
            if any(kw in header_lower for kw in RESPONSE_KEYWORDS):
                titulo = head_cells[0].strip()
                return f'#caja-respuesta(titulo: [{titulo}])\n\n'

        all_cells = [f'[{c}]' for c in head_cells]
        if tbody:
            for row in tbody.get("children", []):
                if row["type"] == "table_row":
                    cells = self._extract_cells(row, state)
                    # Skip rows that are purely whitespace/empty (LLM nbsp rows)
                    if any(c.strip() for c in cells):
                        all_cells.extend(f'[{c}]' for c in cells)
        cells_str = ',\n  '.join(all_cells)
        return f'#tabla-formato(cols: {cols}, (\n  {cells_str},\n))\n\n'

    # -- Rendering helpers ---------------------------------------------------

    def render_children(self, token: dict, state) -> str:
        children = token.get("children", [])
        return "".join(self.render_token(child, state) for child in children)

    def render_token(self, token: dict, state) -> str:
        func = getattr(self, token["type"], None)
        if func:
            return func(token, state)
        if "children" in token:
            return self.render_children(token, state)
        return token.get("raw", "")

    def finalize(self, data, state) -> str:
        return data

    def __call__(self, tokens, state) -> str:
        return "".join(self.render_token(t, state) for t in tokens)


# ---------------------------------------------------------------------------
# Main conversion function
# ---------------------------------------------------------------------------

def _markdown_to_typst(text: str) -> str:
    """
    Convert LLM-generated Markdown (with special annotations) to Typst markup.

    Steps:
    1. Strip residual HTML
    2. Extract math blocks -> placeholders
    3. Pre-process special markers ([LINEAS:N], A. [ ] options)
    4. Parse with mistune (AST mode)
    5. Render with TypstRenderer
    6. Restore math placeholders
    """
    if not text:
        return ""

    # Process explicit <SALTO> tags used to bypass JSON escaping issues
    # Must be done BEFORE HTML stripping to prevent <SALTO> from being deleted
    text = text.replace('<SALTO>', '\n')

    # Force un-indent of tables (mistune fails if tables are indented inside lists without blank lines)
    text = re.sub(r'(?m)^\s+(\|.*\|)\s*$', r'\1', text)
    
    # Force blank line before table if it's immediately following text
    text = re.sub(r'(?m)^([^|\n\s].*)\n(\|.*\|)$', r'\1\n\n\2', text)

    # 0. Strip residual HTML from LLM
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'</?[a-zA-Z][^>]*>', '', text)

    # 1. Extract math
    text, math_map = _extract_math(text)

    # 2. Pre-process special markers
    text = _preprocess_special_marks(text)

    # 3+4. Parse and render with mistune
    renderer = TypstRenderer()
    md = mistune.create_markdown(
        renderer=renderer,
        plugins=["table", "strikethrough"],
    )
    result = md(text)

    # 5. Restore math
    result = _restore_math(result, math_map)

    # 6. Post-process: clean up stray pipe chars and excessive blank lines
    result = _postprocess_typst(result)

    return result.strip()


# ---------------------------------------------------------------------------
# PDF Generator Service
# ---------------------------------------------------------------------------

class PdfGeneratorService:
    """Generates PDFs using the Typst compiler."""

    _TEMPLATE_IMPORT        = "/services/typst_templates/actividad.typ"
    _PRUEBA_TEMPLATE_IMPORT = "/services/typst_templates/prueba_estandarizada.typ"

    def _build_doc(self, actividad: dict, plan: dict, grado: int, docente: bool = False) -> str:
        titulo_raw        = _coerce_str(actividad.get("titulo", "Actividad Evaluativa"))
        instrucciones_raw = _coerce_str(actividad.get("instrucciones", ""))

        contenido_grados = actividad.get("contenido_grados", {})
        contenido_raw    = _coerce_str(
            contenido_grados.get(str(grado), contenido_grados.get(grado, ""))
        )
        clave_raw        = _coerce_str(actividad.get("clave_respuestas", ""))

        area_raw  = plan.get("area", "General")
        area_key  = _normalize_area(area_raw)
        tema_raw  = plan.get("tema", "")

        contenido_typst      = _markdown_to_typst(contenido_raw)
        instrucciones_typst  = _markdown_to_typst(instrucciones_raw)

        clave_typst = ""
        if docente and clave_raw.strip():
            clave_typst = f"#seccion-clave[\n{_markdown_to_typst(clave_raw)}\n]"

        instr_arg = "none"
        if instrucciones_typst.strip():
            instr_arg = f"[{instrucciones_typst}]"

        doc = (
            f'#import "@preview/mitex:0.2.4": *\n'
            f'#import "{self._TEMPLATE_IMPORT}": conf, recuadro, fragmento-lectura, '
            f'lineas-respuesta, grilla, opcion, seccion-clave, bloque-instrucciones, '
            f'dibujo, tabla-formato, caja-respuesta, verdadero-falso, '
            f'relacion, completar-texto, ordenar, corregir-texto, escala\n\n'
            f'#show: doc => conf(\n'
            f'  titulo: "{_escape_str_arg(titulo_raw)}",\n'
            f'  area: "{_escape_str_arg(area_key)}",\n'
            f'  grado: "{_escape_str_arg(str(grado))}",\n'
            f'  tema: "{_escape_str_arg(tema_raw)}",\n'
            f'  instrucciones: {instr_arg},\n'
            f'  doc,\n'
            f')\n\n'
            f'{contenido_typst}\n\n'
            f'{clave_typst}\n'
        )
        return doc

    # -----------------------------------------------------------------------
    # Prueba estandarizada helpers
    # -----------------------------------------------------------------------

    @staticmethod
    def _count_preguntas(contenido_raw: str) -> int:
        """Count numbered multiple-choice questions in the markdown content.

        Looks for bold-numbered patterns like **1.** or plain 1. at line start.
        Returns highest question number found (clamped 1-40).
        """
        nums = re.findall(r'(?m)^\*{0,2}(\d{1,2})\.\*{0,2}\s', contenido_raw)
        if not nums:
            # Fallback: count "A. [ ]" option blocks
            options = re.findall(r'(?m)^A\.\s*\[\s*\]', contenido_raw)
            return max(1, min(len(options), 40))
        return max(1, min(int(max(nums, key=int)), 40))

    @staticmethod
    def _clave_to_typst(clave: dict) -> str:
        """Convert answer key dict {"1": "A", ...} to a Typst dictionary literal."""
        if not isinstance(clave, dict) or not clave:
            return "none"
        items = ", ".join(
            f'"{_escape_str_arg(str(k))}": "{_escape_str_arg(str(v))}"'
            for k, v in clave.items()
        )
        return f"({items},)"

    def _build_prueba_doc(
        self,
        actividad: dict,
        plan: dict,
        grado: int,
        docente: bool = False,
    ) -> str:
        """Build Typst source for a prueba estandarizada PDF.

        Args:
            actividad: The generated activity dict from the DB.
            plan: The planeacion dict (area, tema, etc.).
            grado: The grade to render.
            docente: If True, renders extra page with marked answer sheet.
        """
        titulo_raw        = _coerce_str(actividad.get("titulo", "Prueba Estandarizada"))
        instrucciones_raw = _coerce_str(actividad.get("instrucciones", ""))

        contenido_grados = actividad.get("contenido_grados", {})
        contenido_raw    = _coerce_str(
            contenido_grados.get(str(grado), contenido_grados.get(grado, ""))
        )

        # clave_respuestas should be a dict {"1": "A", ...}
        clave_raw = actividad.get("clave_respuestas", {})
        if isinstance(clave_raw, str):
            import json as _json
            try:
                clave_raw = _json.loads(clave_raw)
            except Exception:
                clave_raw = {}

        area_raw = plan.get("area", "General")
        area_key = _normalize_area(area_raw)
        tema_raw = plan.get("tema", "")

        contenido_typst     = _markdown_to_typst(contenido_raw)
        instrucciones_typst = _markdown_to_typst(instrucciones_raw)

        n_preguntas = self._count_preguntas(contenido_raw)

        instr_arg = "none"
        if instrucciones_typst.strip():
            instr_arg = f"[{instrucciones_typst}]"

        # If docente=True, generate ONLY the answer key
        if docente:
            clave_arg = "none"
            if isinstance(clave_raw, dict) and clave_raw:
                clave_arg = self._clave_to_typst(clave_raw)
                
            return (
                f'#import "@preview/mitex:0.2.4": *\n'
                f'#import "{self._PRUEBA_TEMPLATE_IMPORT}": conf-clave-docente\n\n'
                f'#show: doc => conf-clave-docente(\n'
                f'  titulo: "{_escape_str_arg(titulo_raw)}",\n'
                f'  area: "{_escape_str_arg(area_key)}",\n'
                f'  grado: "{_escape_str_arg(str(grado))}",\n'
                f'  n_preguntas: {n_preguntas},\n'
                f'  clave: {clave_arg},\n'
                f'  doc,\n'
                f')\n\n'
                f'[]\n'
            )

        # Standard student copy
        doc = (
            f'#import "@preview/mitex:0.2.4": *\n'
            f'#import "{self._PRUEBA_TEMPLATE_IMPORT}": '
            f'conf-prueba, hoja-respuestas, recuadro, fragmento-lectura, '
            f'opcion, tabla-formato, bloque-instrucciones\n'
            f'#import "{self._TEMPLATE_IMPORT}": lineas-respuesta, caja-respuesta, '
            f'verdadero-falso, dibujo, grilla, seccion-clave, '
            f'relacion, completar-texto, ordenar, corregir-texto, escala\n\n'
            f'#show: doc => conf-prueba(\n'
            f'  titulo: "{_escape_str_arg(titulo_raw)}",\n'
            f'  area: "{_escape_str_arg(area_key)}",\n'
            f'  grado: "{_escape_str_arg(str(grado))}",\n'
            f'  tema: "{_escape_str_arg(tema_raw)}",\n'
            f'  instrucciones: {instr_arg},\n'
            f'  n_preguntas: {n_preguntas},\n'
            f'  clave: none,\n'
            f'  doc,\n'
            f')\n\n'
            f'{contenido_typst}\n'
        )

        return doc

    def _compile_typst(self, doc_src: str) -> bytes:
        import typst

        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        tmp_dir  = os.path.join(root_dir, ".typst_tmp")
        os.makedirs(tmp_dir, exist_ok=True)

        main_file = os.path.join(tmp_dir, f"main_{uuid.uuid4().hex}.typ")

        with open(main_file, "w", encoding="utf-8") as f:
            f.write(doc_src)

        try:
            pdf_bytes = typst.compile(main_file, root=root_dir)
            return pdf_bytes
        except Exception as e:
            dump_path = os.path.join(root_dir, "error_dump.typ")
            with open(dump_path, "w", encoding="utf-8") as dump_f:
                dump_f.write(doc_src)
            logger.error("Typst compile error. Dump saved to: %s", dump_path)
            raise
        finally:
            if os.path.exists(main_file):
                os.remove(main_file)

    async def generate_pdf(self, actividad: dict, plan: dict, grado: int, docente: bool = False) -> bytes:
        doc_src = self._build_doc(actividad, plan, grado, docente=docente)
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._compile_typst, doc_src)

    async def generate_prueba_pdf(
        self,
        actividad: dict,
        plan: dict,
        grado: int,
        docente: bool = False,
    ) -> bytes:
        """Generate a prueba estandarizada PDF (multiple-choice + answer sheet).

        Args:
            actividad: The actividad_generada dict.
            plan: The planeacion dict.
            grado: The target grade.
            docente: If True, answer bubbles are marked on the answer sheet.
        """
        doc_src = self._build_prueba_doc(actividad, plan, grado, docente=docente)
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, self._compile_typst, doc_src)


pdf_generator_service = PdfGeneratorService()
