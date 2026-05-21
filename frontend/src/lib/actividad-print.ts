import { marked } from "marked";
import { ACTIVIDAD_PRINT_CSS } from "./actividad-print-styles";
import {
  getGradeContent,
  normalizeActividadMarkdown,
} from "./actividad-markdown";

export interface ActividadPlan {
  area: string;
  tema: string;
  grados?: number[];
  actividad_generada?: {
    titulo?: string;
    instrucciones?: string;
    contenido_grados?: Record<string | number, string>;
    clave_respuestas?: string;
  };
}

function markdownToHtml(text: string): string {
  const normalized = normalizeActividadMarkdown(text);
  return marked.parse(normalized, { async: false }) as string;
}

function buildHeaderHtml(plan: ActividadPlan, grade: number): string {
  return `
    <div class="header-info">
      <div class="field">
        <label>Estudiante</label>
        <span class="value blank">&nbsp;</span>
      </div>
      <div class="field">
        <label>Grado</label>
        <span class="value">${grade}</span>
      </div>
      <div class="field">
        <label>Fecha</label>
        <span class="value blank">&nbsp;</span>
      </div>
      <div class="field">
        <label>Área</label>
        <span class="value">${escapeHtml(plan.area)}</span>
      </div>
      <div class="field" style="grid-column: span 2;">
        <label>Tema</label>
        <span class="value">${escapeHtml(plan.tema)}</span>
      </div>
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildGradeSectionHtml(plan: ActividadPlan, grade: number): string {
  const actividad = plan.actividad_generada;
  if (!actividad) return "";

  const gradeContent = getGradeContent(actividad.contenido_grados, grade);
  if (!gradeContent) return "";

  const titulo = actividad.titulo || "Actividad Evaluativa";
  const instrucciones = actividad.instrucciones
    ? markdownToHtml(actividad.instrucciones)
    : "";

  return `
    <h1>${escapeHtml(titulo)}</h1>
    ${buildHeaderHtml(plan, grade)}
    ${instrucciones ? `<div class="instructions">${instrucciones}</div>` : ""}
    <div class="content-body">${markdownToHtml(gradeContent)}</div>
  `;
}

function buildPrintDocumentHtml(bodyContent: string, title: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />
        <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
        <style>${ACTIVIDAD_PRINT_CSS}</style>
      </head>
      <body>
        ${bodyContent}
        <script>
          if (typeof renderMathInElement === "function") {
            renderMathInElement(document.body, {
              delimiters: [
                {left: "$$", right: "$$", display: true},
                {left: "$", right: "$", display: false},
                {left: "\\\\(", right: "\\\\)", display: false},
                {left: "\\\\[", right: "\\\\]", display: true}
              ],
              throwOnError: false
            });
          }
        </script>
      </body>
    </html>
  `;
}

/** Open print dialog for one grade or all grades (sequential windows). */
export function openActividadPrintWindow(
  plan: ActividadPlan,
  grade?: number,
  options?: { autoPrint?: boolean }
): void {
  const autoPrint = options?.autoPrint !== false;
  const grades = plan.grados?.length
    ? plan.grados
    : grade != null
      ? [grade]
      : [];

  const gradesToPrint =
    grade != null ? [grade] : grades.length > 0 ? grades : [];

  if (gradesToPrint.length === 0) {
    const body = buildGradeSectionHtml(plan, 0) || "<p>Sin contenido</p>";
    openSinglePrintWindow(
      buildPrintDocumentHtml(body, plan.actividad_generada?.titulo || "Actividad"),
      autoPrint
    );
    return;
  }

  gradesToPrint.forEach((g, index) => {
    const body = buildGradeSectionHtml(plan, g);
    if (!body) return;
    setTimeout(() => {
      openSinglePrintWindow(
        buildPrintDocumentHtml(
          body,
          `${plan.actividad_generada?.titulo || "Actividad"} - Grado ${g}`
        ),
        autoPrint
      );
    }, index * 800);
  });
}

function openSinglePrintWindow(html: string, autoPrint: boolean): void {
  const printWindow = window.open(
    "about:blank",
    `Print_${Date.now()}_${Math.random()}`,
    "left=50000,top=50000,width=800,height=600"
  );
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  if (autoPrint) {
    setTimeout(() => {
      printWindow.print();
    }, 600);
  }
}
