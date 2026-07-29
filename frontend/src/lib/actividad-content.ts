/** Detect, normalize and sanitize activity content (HTML or Markdown). */

import DOMPurify from "isomorphic-dompurify";

/** Format Q&A dictionary objects into readable Markdown bullet lists. */
export function formatClaveObjectToMarkdown(obj: Record<string, unknown>): string {
  if (!obj || Object.keys(obj).length === 0) return "";

  const lines: string[] = ["### Clave de Respuestas\n"];

  for (const [key, val] of Object.entries(obj)) {
    const keyLabel = !isNaN(Number(key)) ? `Pregunta ${key}` : key;
    if (val != null && typeof val === "object" && !Array.isArray(val)) {
      lines.push(`- **${keyLabel}:**`);
      for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
        lines.push(`  - ${subKey}: **${String(subVal ?? "")}**`);
      }
    } else {
      lines.push(`- **${keyLabel}:** ${String(val ?? "")}`);
    }
  }

  return lines.join("\n");
}

/** Coerce API/AI fields (string, object, array) into text. */
export function coerceActividadMarkdown(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const parts = value
      .map((item) => coerceActividadMarkdown(item))
      .filter((s) => s.length > 0);
    return parts.join("\n\n");
  }
  if (typeof value === "object") {
    return formatClaveObjectToMarkdown(value as Record<string, unknown>);
  }
  return String(value);
}

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

export type ActividadContentFormat = "html" | "markdown";

export interface PreparedActividadContent {
  content: string;
  format: ActividadContentFormat;
}

const HTML_FENCE_RE = /^```(?:html)?\s*\n?([\s\S]*?)```\s*$/im;

const HTML_TAG_RE =
  /<(table|section|article|div|thead|tbody|colgroup|h[1-6]|tr|td|th)\b/i;

/** Strip markdown code fences wrapping HTML. */
export function stripHtmlFences(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(HTML_FENCE_RE);
  if (match) return match[1].trim();
  return text;
}

export function isActividadHtml(text: string): boolean {
  const t = stripHtmlFences(text.trim());
  if (!t) return false;
  if (/^<!DOCTYPE\s+html/i.test(t) || /^<html[\s>]/i.test(t)) return true;
  return HTML_TAG_RE.test(t);
}

export function prepareActividadContent(raw: unknown): PreparedActividadContent {
  const text = coerceActividadMarkdown(raw);
  if (!text) return { content: "", format: "markdown" };

  let prepared = stripHtmlFences(text);
  prepared = formatLatex(prepared);

  if (isActividadHtml(prepared)) {
    return { content: prepared.trim(), format: "html" };
  }

  let normalized = prepared.replace(/<br\s*\/?>/gi, "\n\n");
  normalized = normalized.replace(/\n{4,}/g, "\n\n\n");
  return { content: normalized.trim(), format: "markdown" };
}

const SANITIZE_CONFIG: any = {
  ALLOWED_TAGS: [
    "section",
    "article",
    "h1",
    "h2",
    "h3",
    "h4",
    "p",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "caption",
    "colgroup",
    "col",
    "ul",
    "ol",
    "li",
    "strong",
    "em",
    "b",
    "i",
    "u",
    "span",
    "div",
    "br",
    "hr",
    "sup",
    "sub",
    "blockquote",
  ],
  ALLOWED_ATTR: [
    "class",
    "colspan",
    "rowspan",
    "scope",
    "headers",
    "aria-label",
  ],
  ALLOW_DATA_ATTR: false,
};

export function sanitizeActividadHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, SANITIZE_CONFIG) as unknown as string;
}
