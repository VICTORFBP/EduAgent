/** Normalize AI-generated markdown for consistent preview and print rendering. */

export function formatLatex(text: string): string {
  if (!text) return "";
  return text
    .replace(/\\\\\(/g, "$")
    .replace(/\\\\\)/g, "$")
    .replace(/\\\\\[/g, "$$")
    .replace(/\\\\\]/g, "$$")
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$")
    .replace(/\\\[/g, "$$")
    .replace(/\\\]/g, "$$");
}

/** Map area name to skill label shown in UI (mirrors backend _get_skill_context). */
export function getSkillLabelForArea(area: string): string {
  const areaLower = area.toLowerCase();
  if (areaLower.includes("matemática") || areaLower.includes("matematica")) {
    return "Matemáticas";
  }
  if (areaLower.includes("lenguaje") || areaLower.includes("castellano")) {
    return "Lenguaje";
  }
  if (areaLower.includes("ciencia")) {
    return "Ciencias";
  }
  return "General";
}

export function normalizeActividadMarkdown(text: string): string {
  if (!text) return "";

  let normalized = formatLatex(text);

  // HTML line breaks → paragraph breaks (ReactMarkdown does not render raw HTML)
  normalized = normalized.replace(/<br\s*\/?>/gi, "\n\n");

  // Collapse excessive blank lines
  normalized = normalized.replace(/\n{4,}/g, "\n\n\n");

  return normalized.trim();
}

export function getGradeContent(
  contenidoGrados: Record<string | number, string> | undefined,
  grade: number
): string | null {
  if (!contenidoGrados) return null;
  const content =
    contenidoGrados[grade] ??
    contenidoGrados[grade.toString()] ??
    contenidoGrados[String(grade)];
  return content ? normalizeActividadMarkdown(String(content)) : null;
}
