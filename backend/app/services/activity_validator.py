"""EduAgent — Activity Validator, Sanitizer and Linter.

Provides deterministic sanitization, Markdown/Typst linting, component normalization,
and dry-run Typst compilation validation for all generated activities.
"""
from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# 1. Deterministic Markdown Sanitization and Linter
# ---------------------------------------------------------------------------

def sanitize_activity_markdown(text: str, is_prueba: bool = False) -> str:
    """
    Sanitize and lint LLM-generated Markdown for EduAgent activities:
    1. Strip residual HTML tags (<br>, <div>, <span>, <table>, <b>, <style>, <font>).
    2. Convert plain text Verdadero/Falso blocks into Markdown tables.
    3. Normalize Markdown tables and unindent them.
    4. Normalize blockquote components (> RELACION, > COMPLETAR, > ORDENAR, etc.).
    5. Normalize multiple-choice options to canonical 'A. [ ] texto'.
    6. For standard workshops: Ensure open-ended questions have [LINEAS:N] response spaces.
       For pruebas estandarizadas: Strip open response lines and drawing blocks.
    7. Balance LaTeX math delimiters ($...$).
    """
    if not text or not isinstance(text, str):
        return ""

    # Strip code block wrappers if the LLM returned ```markdown ... ``` inside the string
    text = re.sub(r'^```(?:markdown)?\s*\n', '', text.strip(), flags=re.IGNORECASE)
    text = re.sub(r'\n```\s*$', '', text.strip())

    # 1. Strip residual HTML tags while preserving linebreaks
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'&nbsp;', ' ', text)
    # Strip dangerous HTML tags
    text = re.sub(r'</?(?:div|span|table|tr|td|th|tbody|thead|b|i|p|strong|em|font|style|script|section|article)[^>]*>', '', text, flags=re.IGNORECASE)

    # 2. Normalize plain text Verdadero/Falso blocks before table parsing
    text = _convert_vf_plaintext_to_table(text)

    # 3. Normalize tables: ensure blank lines before/after tables and unindent
    text = re.sub(r'(?m)^\s+(\|.*\|)\s*$', r'\1', text)
    text = re.sub(r'(?m)^([^|\n\s].*)\n(\|.*\|)$', r'\1\n\n\2', text)

    # 4. Normalize blockquote components
    text = _normalize_components(text)

    # 5. Normalize multiple choice options
    text = _normalize_multiple_choice(text)

    # 6. Response spaces
    if is_prueba:
        # Standardized tests NEVER have open response lines or drawing blocks
        text = re.sub(r'(?m)^\s*\[LINEAS:\d+\]\s*$', '', text)
        text = re.sub(r'(?m)^\s*>\s*🎨\s*DIBUJO[^\n]*', '', text)
    else:
        text = _ensure_question_response_lines(text)

    # 7. Balance inline math markers
    text = _balance_inline_math(text)

    # 8. Clean excessive consecutive blank lines (max 2)
    text = re.sub(r'\n{3,}', '\n\n', text)

    return text.strip()


def _convert_vf_plaintext_to_table(text: str) -> str:
    """Convert plain text True/False blocks to proper Markdown tables."""
    lines = text.split('\n')
    result = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # Match header line like "Afirmación V F" or "Afirmacion   V   F" or "V / F"
        header_match = re.match(
            r'^\s*(?:\*{0,2})[Aa]firmaci[oó]n\s+(?:V|Verdadero)\s+(?:F|Falso)(?:\*{0,2})\s*$',
            line.strip(),
            re.IGNORECASE
        )
        if header_match:
            prev_lines = '\n'.join(result[-3:])
            if '|' not in prev_lines:
                stmts = []
                j = i + 1
                while j < len(lines):
                    stmt = lines[j].strip()
                    if stmt == '' or stmt.startswith('|') or stmt.startswith('#') or stmt.startswith('>'):
                        break
                    if re.match(r'^[-|:\s]+$', stmt):
                        j += 1
                        continue
                    # Remove list numbers like "1. ", "a) "
                    clean_stmt = re.sub(r'^\d+[\.\-\)]\s*', '', stmt).strip()
                    if clean_stmt:
                        stmts.append(clean_stmt)
                    j += 1
                if stmts:
                    result.append('| Afirmación | V | F |<SALTO>|:-----------|:-:|:-:|')
                    for stmt in stmts:
                        result.append(f'| {stmt} | | |<SALTO>')
                    i = j
                    continue
        result.append(line)
        i += 1
    return '\n'.join(result)


def _normalize_components(text: str) -> str:
    """
    Normalizes specific EduAgent components:
    - > 📋 RELACION: Ensure header format and pipe delimiter.
    - > 🧩 COMPLETAR: Ensure ___ underscores.
    - > 📝 ORDENAR: Clean numeric prefixes from items.
    - > 🔢 ESCALA: Ensure header line with | and individual items.
    """
    lines = text.split('\n')
    out_lines = []
    i = 0
    n = len(lines)

    while i < n:
        line = lines[i]
        stripped = line.strip()

        # Check for start of blockquote component
        if stripped.startswith('>'):
            upper = stripped.upper()

            # ─── RELACION ───
            if 'RELACION' in upper or '\U0001f4cb' in stripped:
                out_lines.append('> 📋 RELACION')
                i += 1
                # Collect rest of blockquote lines
                bq_lines = []
                while i < n and lines[i].strip().startswith('>'):
                    cleaned_bq = re.sub(r'^>\s*', '', lines[i]).strip()
                    if cleaned_bq:
                        bq_lines.append(cleaned_bq)
                    i += 1

                if bq_lines:
                    # Check if first line has column titles with ↔ or |
                    has_titles = '↔' in bq_lines[0] or (
                        '|' in bq_lines[0] and any(kw in bq_lines[0].lower() for kw in ('columna', 'concepto', 'definición', 'término', 'descripción', 'operación', 'resultado', 'característica'))
                    )
                    if has_titles:
                        col_line = bq_lines[0].replace('|', '↔')
                        parts = col_line.split('↔', 1)
                        out_lines.append(f'> {parts[0].strip()} ↔ {parts[1].strip()}')
                        item_lines = bq_lines[1:]
                    else:
                        out_lines.append('> Columna A ↔ Columna B')
                        item_lines = bq_lines

                    for item_ln in item_lines:
                        # Clean item line
                        clean_item = re.sub(r'^\d+[\.\-\)]\s*', '', item_ln).strip()
                        clean_item = re.sub(r'^[-*]\s*', '', clean_item).strip()
                        if '|' in clean_item:
                            p_izq, p_der = clean_item.split('|', 1)
                            out_lines.append(f'> {p_izq.strip()} | {p_der.strip()}')
                        elif '↔' in clean_item:
                            p_izq, p_der = clean_item.split('↔', 1)
                            out_lines.append(f'> {p_izq.strip()} | {p_der.strip()}')
                        elif ' - ' in clean_item:
                            p_izq, p_der = clean_item.split(' - ', 1)
                            out_lines.append(f'> {p_izq.strip()} | {p_der.strip()}')
                        elif clean_item:
                            out_lines.append(f'> {clean_item} | ')
                continue

            # ─── COMPLETAR ───
            if 'COMPLETAR' in upper or '\U0001f9e9' in stripped:
                out_lines.append('> 🧩 COMPLETAR')
                i += 1
                while i < n and lines[i].strip().startswith('>'):
                    cleaned_bq = re.sub(r'^>\s*', '', lines[i]).strip()
                    # Normalize any sequence of 3 or more underscores to ___
                    cleaned_bq = re.sub(r'_{3,}', '___', cleaned_bq)
                    if cleaned_bq:
                        out_lines.append(f'> {cleaned_bq}')
                    i += 1
                continue

            # ─── ORDENAR ───
            if 'ORDENAR' in upper or '\U0001f4dd' in stripped:
                out_lines.append('> 📝 ORDENAR')
                i += 1
                bq_lines = []
                while i < n and lines[i].strip().startswith('>'):
                    cleaned_bq = re.sub(r'^>\s*', '', lines[i]).strip()
                    if cleaned_bq:
                        bq_lines.append(cleaned_bq)
                    i += 1

                if bq_lines:
                    # First line might be instruction or first item
                    first = bq_lines[0]
                    first_is_instr = any(kw in first.lower() for kw in ('ordena', 'pasos', 'secuencia', 'cronología', 'partes', 'etapas', ':'))
                    if first_is_instr and len(bq_lines) > 1:
                        out_lines.append(f'> {first}')
                        item_lines = bq_lines[1:]
                    else:
                        out_lines.append('> Ordena los siguientes elementos:')
                        item_lines = bq_lines

                    for item_ln in item_lines:
                        # Clean leading numbers and bullet points (e.g. "1. ", "2) ", "- ")
                        clean_item = re.sub(r'^\d+[\.\-\)]\s*', '', item_ln).strip()
                        clean_item = re.sub(r'^[-*]\s*', '', clean_item).strip()
                        if clean_item:
                            out_lines.append(f'> {clean_item}')
                continue

            # ─── ESCALA ───
            if 'ESCALA' in upper or '\U0001f522' in stripped:
                out_lines.append('> 🔢 ESCALA')
                i += 1
                bq_lines = []
                while i < n and lines[i].strip().startswith('>'):
                    cleaned_bq = re.sub(r'^>\s*', '', lines[i]).strip()
                    if cleaned_bq:
                        bq_lines.append(cleaned_bq)
                    i += 1

                if bq_lines:
                    if '|' in bq_lines[0]:
                        out_lines.append(f'> {bq_lines[0]}')
                        item_lines = bq_lines[1:]
                    else:
                        out_lines.append('> Mucho | Algo | Poco | Nada')
                        item_lines = bq_lines

                    for item_ln in item_lines:
                        clean_item = re.sub(r'^\d+[\.\-\)]\s*', '', item_ln).strip()
                        clean_item = re.sub(r'^[-*]\s*', '', clean_item).strip()
                        if clean_item:
                            out_lines.append(f'> {clean_item}')
                continue

            # ─── DIBUJO, FRAGMENTO, RECUADRO, CORREGIR, GRILLA ───
            out_lines.append(line)
            i += 1
            continue

        out_lines.append(line)
        i += 1

    return '\n'.join(out_lines)


def _normalize_multiple_choice(text: str) -> str:
    """Normalize multiple-choice option lines to canonical 'A. [ ] Option text'."""
    # Convert '- **A:** texto', '* **A:** texto', '**A:** texto', '- A) texto', 'A. [ ] texto'
    text = re.sub(
        r'(?m)^\s*(?:[-*]\s*)?(?:\*{0,2})([A-Ea-e])(?:\*{0,2})[:.)]\s*(?:\[\s*\]\s*)?(.+)$',
        lambda m: f"{m.group(1).upper()}. [ ] {m.group(2).strip()}",
        text
    )
    # Convert 'A. [] texto' -> 'A. [ ] texto'
    text = re.sub(
        r'(?m)^\s*([A-Ea-e])\.\s*\[\s*\]\s*(.+)$',
        lambda m: f"{m.group(1).upper()}. [ ] {m.group(2).strip()}",
        text
    )
    return text


def _ensure_question_response_lines(text: str) -> str:
    """
    Detects open questions without response space and automatically appends [LINEAS:4].
    """
    lines = text.split('\n')
    out_lines = []
    n = len(lines)

    open_question_patterns = [
        r'^\s*(?:\d+[\.\)]\s*)?(?:\*{0,2})[¿\?]',                          # Starts with ¿
        r'^\s*(?:\d+[\.\)]\s*)?(?:\*{0,2})(?:Explica|Describe|Menciona|Escribe|Calcula|Resuelve|Define|Justifica|Analiza|Indica|Formula|Compara|Argumenta)\b', # Open imperative
    ]

    for i in range(n):
        line = lines[i]
        out_lines.append(line)
        stripped = line.strip()

        # Check if line is an open question
        is_open_q = any(re.search(pat, stripped, re.IGNORECASE) for pat in open_question_patterns)
        
        # Don't trigger if it's already an option or inside a table or blockquote
        if is_open_q and not stripped.startswith('>') and not stripped.startswith('|') and not re.match(r'^[A-E]\.\s*\[', stripped):
            # Look ahead to see if the next non-empty line provides space or options
            has_space_after = False
            for j in range(i + 1, min(i + 4, n)):
                next_line = lines[j].strip()
                if not next_line:
                    continue
                # If next line is a response marker, options, drawing, or table:
                if (
                    next_line.startswith('[LINEAS:')
                    or next_line.startswith('> 🎨 DIBUJO')
                    or next_line.startswith('> 📦 RECUADRO')
                    or next_line.startswith('> 📦 GRILLA')
                    or next_line.startswith('> 📋 RELACION')
                    or next_line.startswith('> 🧩 COMPLETAR')
                    or next_line.startswith('> 📝 ORDENAR')
                    or next_line.startswith('> 🔢 ESCALA')
                    or next_line.startswith('|')
                    or re.match(r'^[A-E]\.\s*\[', next_line)
                    or re.match(r'^_{3,}', next_line)
                ):
                    has_space_after = True
                    break
                # If next line is another question or heading, stop looking
                if next_line.startswith('#') or any(re.search(pat, next_line, re.IGNORECASE) for pat in open_question_patterns):
                    break

            if not has_space_after:
                # Add response lines
                out_lines.append('\n[LINEAS:4]\n')

    return '\n'.join(out_lines)


def _normalize_math_expressions(text: str) -> str:
    """Normalize LaTeX-style math and unescaped control chars into clean Typst/Markdown formulas."""
    # Convert formfeed \x0crac or \frac{a}{b} -> a/b
    text = re.sub(r'(?:\\frac|\x0crac)\{([^}]+)\}\{([^}]+)\}', r'\1/\2', text)
    text = re.sub(r'\\times', '×', text)
    text = re.sub(r'\\div', '÷', text)
    text = re.sub(r'\\pm', '±', text)
    text = re.sub(r'\\leq?', '≤', text)
    text = re.sub(r'\\geq?', '≥', text)
    text = re.sub(r'\\neq?', '≠', text)
    text = re.sub(r'\\cdot', '·', text)
    text = re.sub(r'\\sqrt\{([^}]+)\}', r'sqrt(\1)', text)
    return text


def _balance_inline_math(text: str) -> str:
    """Check and balance unclosed single '$' or '$$' math delimiters."""
    text = _normalize_math_expressions(text)
    lines = text.split('\n')
    sanitized_lines = []
    for line in lines:
        # Count non-escaped $
        dollar_count = len(re.findall(r'(?<!\\)\$', line))
        if dollar_count % 2 != 0:
            # Unbalanced $ on this line — add closing $ at end of formula/line
            line = line + '$'
        sanitized_lines.append(line)
    return '\n'.join(sanitized_lines)


# ---------------------------------------------------------------------------
# 2. Full Activity Dictionary Sanitization & Normalization
# ---------------------------------------------------------------------------

def _sanitize_clave_respuestas_for_prueba(
    clave_respuestas: Any,
    contenido_grados: dict[str, str],
) -> dict:
    """
    Ensures clave_respuestas is a clean dict where every question number (1..N)
    maps strictly to a single uppercase letter ("A", "B", "C", or "D").
    Extracts letters from dirty strings (e.g. "C) La perseverancia" -> "C", "Respuesta B" -> "B").
    If a value is a full sentence without letter, searches question options in markdown for match.
    """
    if isinstance(clave_respuestas, str):
        try:
            import json as _json
            clave_respuestas = _json.loads(clave_respuestas)
        except Exception:
            clave_respuestas = {}

    if isinstance(clave_respuestas, list):
        clave_dict = {}
        for idx, item in enumerate(clave_respuestas, start=1):
            if isinstance(item, dict):
                for pk, pv in item.items():
                    clave_dict[str(pk)] = pv
            else:
                clave_dict[str(idx)] = item
        clave_respuestas = clave_dict

    if not isinstance(clave_respuestas, dict):
        clave_respuestas = {}

    # Extract all question texts and their options from contenido_grados for fallback matching
    first_content = next(iter(contenido_grados.values()), "") if contenido_grados else ""
    q_options: dict[str, dict[str, str]] = {}
    
    # Split questions by numbered headings (e.g. **1.**, 1., **Pregunta 1:**)
    q_blocks = re.split(r'(?m)^\s*(?:\*{0,2}|[Pp]regunta\s+)(\d{1,2})[\.\:]\s*(?:\*{0,2})', first_content)
    if len(q_blocks) > 1:
        for idx in range(1, len(q_blocks), 2):
            q_num = q_blocks[idx]
            q_body = q_blocks[idx + 1] if idx + 1 < len(q_blocks) else ""
            opts: dict[str, str] = {}
            for opt_match in re.finditer(r'(?m)^([A-D])\.\s*\[\s*\]\s*(.+)$', q_body):
                opts[opt_match.group(1).upper()] = opt_match.group(2).strip().lower()
            if opts:
                q_options[str(q_num)] = opts

    cleaned_clave = {}
    for k, v in clave_respuestas.items():
        k_str = str(k).strip()
        v_str = str(v).strip()
        
        # 1. Direct letter match: "A", "B", "C", "D"
        if v_str.upper() in ("A", "B", "C", "D"):
            cleaned_clave[k_str] = v_str.upper()
            continue

        # 2. Leading/Isolated letter match: "A.", "A)", "(A)", "Opción A", "Respuesta: A"
        m = re.search(r'(?:^|[^\w])([A-D])(?:[.)\s]|$)', v_str, re.IGNORECASE)
        if m:
            cleaned_clave[k_str] = m.group(1).upper()
            continue

        # 3. Match sentence text against question options if available
        matched_letter = None
        if k_str in q_options:
            v_lower = v_str.lower()
            for opt_letter, opt_text in q_options[k_str].items():
                if opt_text and (opt_text in v_lower or v_lower in opt_text or len(set(opt_text.split()) & set(v_lower.split())) >= 2):
                    matched_letter = opt_letter
                    break
        
        if matched_letter:
            cleaned_clave[k_str] = matched_letter
        else:
            cleaned_clave[k_str] = "A"

    # Ensure any question parsed from content exists in clave_respuestas
    for q_num in q_options.keys():
        if str(q_num) not in cleaned_clave:
            cleaned_clave[str(q_num)] = "A"

    return cleaned_clave


def _format_question_dict(q_dict: dict, idx: int = 1) -> str:
    """Formats a question dictionary (e.g. from LLM json list) into canonical Markdown."""
    if not isinstance(q_dict, dict):
        return str(q_dict)

    if "contenido" in q_dict and len(q_dict) == 1:
        return str(q_dict["contenido"])

    q_num = q_dict.get("numero") or q_dict.get("num") or q_dict.get("pregunta_numero") or str(idx)
    q_num = re.sub(r'^[Pp]regunta\s*', '', str(q_num)).rstrip('.:')
    enunciado = q_dict.get("enunciado") or q_dict.get("pregunta") or q_dict.get("texto") or ""

    lines = []
    if enunciado:
        lines.append(f"**{q_num}.** {enunciado}\n")

    opciones = q_dict.get("opciones") or q_dict.get("alternativas")
    if isinstance(opciones, dict):
        for letter in ["A", "B", "C", "D"]:
            if letter in opciones:
                lines.append(f"{letter}. [ ] {opciones[letter]}")
            elif letter.lower() in opciones:
                lines.append(f"{letter}. [ ] {opciones[letter.lower()]}")
    elif isinstance(opciones, list):
        for i, opt in enumerate(opciones):
            letter = chr(65 + i)
            lines.append(f"{letter}. [ ] {opt}")
    else:
        for letter in ["A", "B", "C", "D", "a", "b", "c", "d"]:
            if letter in q_dict:
                lines.append(f"{letter.upper()}. [ ] {q_dict[letter]}")

    return "\n".join(lines)


def _parse_list_to_contenido_grados(raw_list: list, grados: list[int] | None) -> dict[str, str]:
    """Converts a raw list returned by LLM into a dictionary mapping grade string -> Markdown text."""
    target_grades = [str(g) for g in grados] if grados else ["1"]

    # Check if items in raw_list specify "grado"
    has_explicit_grades = any(isinstance(item, dict) and "grado" in item for item in raw_list)
    if has_explicit_grades:
        grouped: dict[str, list[str]] = {}
        for item in raw_list:
            if isinstance(item, dict) and "grado" in item:
                g_str = str(item["grado"])
                cnt = item.get("contenido") or item.get("texto") or _format_question_dict(item)
                grouped.setdefault(g_str, []).append(str(cnt))
            else:
                grouped.setdefault(target_grades[0], []).append(str(item))
        return {g: "\n\n".join(parts) for g, parts in grouped.items()}

    # If single grade requested, all items in list belong to this single grade
    if len(target_grades) == 1:
        g_str = target_grades[0]
        parts = []
        for idx, item in enumerate(raw_list, start=1):
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                parts.append(_format_question_dict(item, idx))
            else:
                parts.append(str(item))
        return {g_str: "\n\n".join(parts)}

    # If multiple grades and items count matches grades count
    if len(raw_list) == len(target_grades):
        res = {}
        for g_str, item in zip(target_grades, raw_list):
            if isinstance(item, str):
                res[g_str] = item
            elif isinstance(item, dict):
                res[g_str] = item.get("contenido") or _format_question_dict(item)
            else:
                res[g_str] = str(item)
        return res

    # General fallback
    return {target_grades[0]: "\n\n".join(str(x) for x in raw_list)}


def validate_and_sanitize_activity(
    actividad: dict,
    grados: list[int] | None = None,
    tipo_actividad: str | None = None,
    plan: dict | None = None,
) -> dict:
    """
    Validates and sanitizes all fields of an activity dictionary.
    Ensures:
      - 'titulo', 'area', 'tema', 'instrucciones' are clean strings.
      - 'contenido_grados' maps every target grade to a sanitized Markdown string.
      - 'clave_respuestas' is clean and well-formed.
    """
    if not isinstance(actividad, dict):
        logger.warning(f"Expected dict for actividad, got {type(actividad)}")
        return {}

    from app.services.pdf_generator import _is_prueba_estandarizada

    plan_tipo = plan.get("tipo_actividad") if isinstance(plan, dict) else None
    titulo_raw = str(actividad.get("titulo", "")).strip()
    is_prueba = (
        _is_prueba_estandarizada(tipo_actividad)
        or _is_prueba_estandarizada(plan_tipo)
        or _is_prueba_estandarizada(titulo_raw)
    )

    sanitized = {
        "titulo": titulo_raw or "Actividad Evaluativa",
        "area": str(actividad.get("area", "")).strip(),
        "tema": str(actividad.get("tema", "")).strip(),
        "instrucciones": str(actividad.get("instrucciones", "")).strip(),
        "contenido_grados": {},
        "clave_respuestas": actividad.get("clave_respuestas", {}),
    }

    # Handle contenido_grados
    raw_contenido = actividad.get("contenido_grados", {})
    if isinstance(raw_contenido, str):
        first_grade = str(grados[0]) if grados else "1"
        sanitized["contenido_grados"][first_grade] = sanitize_activity_markdown(raw_contenido, is_prueba=is_prueba)
    elif isinstance(raw_contenido, list):
        parsed_dict = _parse_list_to_contenido_grados(raw_contenido, grados)
        for g_k, g_v in parsed_dict.items():
            sanitized["contenido_grados"][str(g_k)] = sanitize_activity_markdown(g_v, is_prueba=is_prueba)
    elif isinstance(raw_contenido, dict):
        for grado_key, content in raw_contenido.items():
            if isinstance(content, str):
                sanitized["contenido_grados"][str(grado_key)] = sanitize_activity_markdown(content, is_prueba=is_prueba)
            elif isinstance(content, (dict, list)):
                from app.services.pdf_generator import _coerce_str
                coerced = _coerce_str(content)
                sanitized["contenido_grados"][str(grado_key)] = sanitize_activity_markdown(coerced, is_prueba=is_prueba)

    # Ensure all requested grades exist
    if grados:
        for g in grados:
            g_str = str(g)
            if g_str not in sanitized["contenido_grados"]:
                if g in raw_contenido:
                    sanitized["contenido_grados"][g_str] = sanitize_activity_markdown(str(raw_contenido[g]), is_prueba=is_prueba)
                elif sanitized["contenido_grados"]:
                    first_avail = next(iter(sanitized["contenido_grados"].values()))
                    sanitized["contenido_grados"][g_str] = first_avail

    # Sanitize clave_respuestas for standardized tests
    if is_prueba:
        sanitized["clave_respuestas"] = _sanitize_clave_respuestas_for_prueba(
            sanitized["clave_respuestas"],
            sanitized["contenido_grados"],
        )

    return sanitized


# ---------------------------------------------------------------------------
# 3. Dry-Run Typst Compilation Validation
# ---------------------------------------------------------------------------

def test_typst_compilation(
    actividad: dict,
    plan: dict,
    grados: list[int] | None = None,
) -> tuple[bool, str | None, dict | None]:
    """
    Test compiles the activity using the actual Typst compiler for all requested grades.
    Tests both Student copy and Teacher (docente=True) copy.

    Returns:
        (success: bool, error_message: str | None, failure_info: dict | None)
    """
    from app.services.pdf_generator import pdf_generator_service, _is_prueba_estandarizada

    target_grados = grados or []
    if not target_grados and "contenido_grados" in actividad:
        target_grados = [int(k) for k in actividad["contenido_grados"].keys() if str(k).isdigit()]

    if not target_grados:
        target_grados = [5]

    is_prueba = _is_prueba_estandarizada(plan.get("tipo_actividad")) or _is_prueba_estandarizada(actividad.get("titulo"))

    for g in target_grados:
        # 1. Test Student PDF
        try:
            if is_prueba:
                doc_src = pdf_generator_service._build_prueba_doc(actividad, plan, g, docente=False)
            else:
                doc_src = pdf_generator_service._build_doc(actividad, plan, g, docente=False)

            pdf_generator_service._compile_typst(doc_src)
        except Exception as e:
            err_msg = str(e)
            logger.error(f"Dry-run Typst compilation failed for grade {g} (Student): {err_msg}")
            return False, err_msg, {"grado": g, "docente": False, "is_prueba": is_prueba, "doc_src": doc_src}

        # 2. Test Teacher / Docente PDF
        try:
            if is_prueba:
                doc_src_doc = pdf_generator_service._build_prueba_doc(actividad, plan, g, docente=True)
            else:
                doc_src_doc = pdf_generator_service._build_doc(actividad, plan, g, docente=True)

            pdf_generator_service._compile_typst(doc_src_doc)
        except Exception as e:
            err_msg = str(e)
            logger.error(f"Dry-run Typst compilation failed for grade {g} (Docente): {err_msg}")
            return False, err_msg, {"grado": g, "docente": True, "is_prueba": is_prueba, "doc_src": doc_src_doc}

    logger.info(f"Dry-run Typst compilation succeeded for all grades: {target_grados}")
    return True, None, None
