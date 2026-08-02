"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Copy, Printer, ChevronDown, Download, Maximize2, ClipboardList, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ActividadDocument,
  getActividadGradesWithContent,
} from "@/components/planeacion/ActividadDocument";
import { ActividadMarkdown } from "@/components/planeacion/ActividadMarkdown";
import {
  coerceActividadMarkdown,
  getGradeContent,
  getSkillLabelForArea,
  isPlainMarkdownString,
} from "@/lib/actividad-markdown";
import { openActividadPrintWindow } from "@/lib/actividad-print";

export type ActividadViewMode = "document" | "teacher" | "docente-prueba";

export interface ActividadDialogPlan {
  id?: string;
  area: string;
  tema: string;
  grados?: number[];
  actividad_generada?: {
    titulo?: string;
    instrucciones?: string;
    contenido_grados?: Record<string | number, string>;
    clave_respuestas?: unknown;
  };
}

export interface ActividadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: ActividadDialogPlan;
  initialGrade?: number | null;
}

export function ActividadDialog({
  open,
  onOpenChange,
  plan,
  initialGrade = null,
}: ActividadDialogProps) {
  const [viewMode, setViewMode] = useState<ActividadViewMode>("document");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const actividad = plan.actividad_generada;
  const actividadGrades = actividad ? getActividadGradesWithContent(plan) : [];

  // Detect prueba estandarizada by tipo_actividad field
  const isPruebaEstandarizada = (() => {
    const tipo = (plan as any).tipo_actividad ?? "";
    const t = tipo.toLowerCase();
    return t.includes("prueba") && t.includes("estandar");
  })();

  // Build the PDF url based on activity type
  const buildPdfUrl = (grade: number | null | undefined, docenteMode = false) => {
    if (!grade) return null;
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const ts = Date.now();
    if (isPruebaEstandarizada) {
      return `${base}/planeacion/${plan.id}/actividad/prueba-pdf?grado=${grade}${
        docenteMode ? "&docente=true" : ""
      }&t=${ts}`;
    }
    return `${base}/planeacion/${plan.id}/actividad/pdf?grado=${grade}${
      docenteMode ? "&docente=true" : ""
    }&t=${ts}#toolbar=0&navpanes=0`;
  };

  useEffect(() => {
    if (!open) return;
    const grades = actividad ? getActividadGradesWithContent(plan) : [];
    const defaultGrade =
      initialGrade ?? grades[0] ?? plan.grados?.[0] ?? null;
    setSelectedGrade(defaultGrade);
    setViewMode("document");
  }, [open, initialGrade, plan, actividad]);

  const handleCopy = () => {
    if (!actividad) return;
    let textToCopy = `${actividad.titulo}\n\nInstrucciones: ${actividad.instrucciones}\n\n`;
    plan.grados?.forEach((g) => {
      const gradeContent =
        actividad.contenido_grados?.[g] ??
        actividad.contenido_grados?.[g.toString()];
      if (gradeContent) {
        textToCopy += `--- GRADO ${g} ---\n${gradeContent}\n\n`;
      }
    });
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = (grade?: number) => {
    if (!actividad) return;
    const gradeToPrint =
      grade ?? (selectedGrade != null ? selectedGrade : undefined);
    openActividadPrintWindow(plan, gradeToPrint);
  };

  const handlePrintAll = () => {
    if (!actividad) return;
    openActividadPrintWindow(plan);
  };

  const displayGrade =
    selectedGrade ?? actividadGrades[0] ?? plan.grados?.[0] ?? null;
  const gradeContent =
    displayGrade != null && actividad
      ? getGradeContent(actividad.contenido_grados, displayGrade)
      : null;

  const claveRaw = actividad?.clave_respuestas;

  // A per-grade object has entries where values are full Markdown text for each grade (e.g. { "5": "## Solucionario Grado 5..." }).
  // If the object maps question numbers ("1", "2", "3", ...) to short answers or sub-objects, it is a Q&A map.
  const isPerGradeObject =
    claveRaw != null &&
    typeof claveRaw === "object" &&
    !Array.isArray(claveRaw) &&
    Object.entries(claveRaw as object).every(([_, v]) => typeof v === "string" && (v.length > 50 || v.includes("\n")));

  const isQandAMap =
    claveRaw != null &&
    typeof claveRaw === "object" &&
    !Array.isArray(claveRaw) &&
    !isPerGradeObject;

  const needsRegenerate =
    claveRaw != null &&
    claveRaw !== "" &&
    !isPlainMarkdownString(claveRaw) &&
    !isPerGradeObject &&
    !isQandAMap &&
    !isPruebaEstandarizada;

  let displayClave: unknown = claveRaw;
  if (isPerGradeObject && displayGrade != null && !isPruebaEstandarizada) {
    displayClave = getGradeContent(claveRaw as Record<string, string>, displayGrade) ?? claveRaw;
  } else if (isQandAMap) {
    displayClave = coerceActividadMarkdown(claveRaw);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-white/10 bg-neutral-900/95 text-foreground max-w-[min(1100px,95vw)] w-full h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
            <BookOpen className="w-5 h-5 text-emerald-500" />
            {actividad?.titulo || "Actividad Evaluativa"}
          </DialogTitle>
          <DialogDescription className="text-xs text-neutral-400 flex flex-wrap items-center gap-2">
            <span>
              Taller práctico evaluativo diseñado específicamente para esta
              planeación curricular.
            </span>
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
            >
              Skill aplicada: {getSkillLabelForArea(plan.area)}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b border-white/10 pb-3 mt-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => setViewMode("document")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === "document"
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                : "bg-white/5 text-muted-foreground border border-transparent hover:bg-white/10"
            }`}
          >
            {isPruebaEstandarizada ? "Prueba" : "Documento"}
          </button>
          {isPruebaEstandarizada ? (
            <button
              type="button"
              onClick={() => setViewMode("docente-prueba")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "docente-prueba"
                  ? "bg-violet-500/20 text-violet-400 border border-violet-500/30"
                  : "bg-white/5 text-muted-foreground border border-transparent hover:bg-white/10"
              }`}
            >
              <ClipboardList className="inline w-3 h-3 mr-1" />
              Clave Docente
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setViewMode("teacher")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === "teacher"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-muted-foreground border border-transparent hover:bg-white/10"
              }`}
            >
              Solucionario (Docente)
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto py-4 pr-1 min-h-0">
          {(viewMode === "document" || viewMode === "docente-prueba") ? (
            <div className="space-y-4 h-full flex flex-col">
              {actividadGrades.length >= 2 && (
                <div className="flex flex-wrap gap-2 sticky top-0 z-10 bg-neutral-900/90 py-2 -mt-2">
                  {actividadGrades.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setSelectedGrade(g)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        displayGrade === g
                          ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                          : "bg-white/5 text-muted-foreground border border-transparent hover:bg-white/10"
                      }`}
                    >
                      Grado {g}
                    </button>
                  ))}
                </div>
              )}
              {/* AI Image section removed */}
              <div className="flex-1 w-full bg-neutral-950 rounded-xl border border-white/5 overflow-hidden relative min-h-[500px]">
                {displayGrade == null ? (
                  <p className="text-sm text-muted-foreground p-8 text-center mt-20">
                    Selecciona un grado.
                  </p>
                ) : (() => {
                    const isDocente = viewMode === "docente-prueba";
                    const pdfUrl = buildPdfUrl(displayGrade, isDocente);
                    return (
                      <iframe
                        src={pdfUrl ?? ""}
                        className="w-full h-full border-0 bg-white"
                        title={`PDF ${isDocente ? "Clave Docente" : "Actividad"} Grado ${displayGrade}`}
                      />
                    );
                  })()
                }
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-[800px] mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold text-sm text-emerald-400">
                  Guía de Respuestas y Criterios de Calificación
                </h4>
                <Link
                  href={`/evaluacion/nueva?planeacion_id=${plan.id}&grado=${displayGrade || ""}&area=${encodeURIComponent(plan.area)}&tipo=abierta`}
                >
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                  >
                    Calificar con Gemini Vision
                  </Button>
                </Link>
              </div>
              {needsRegenerate && (
                <p className="text-xs text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                  El solucionario guardado tiene un formato antiguo. Regenera la
                  actividad para obtener el formato actualizado.
                </p>
              )}
              <div className="bg-white text-black p-8 sm:p-12 shadow-2xl rounded-sm border-2 border-emerald-500/40">
                <ActividadMarkdown
                  content={displayClave ?? ""}
                  variant="document"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-t border-white/10 pt-4 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {viewMode === "teacher"
              ? "Guarda el solucionario de forma confidencial."
              : "Vista del documento tal como se imprimirá."}
          </span>
          <div className="flex flex-wrap gap-2 justify-end">
            <Link
              href={`/evaluacion/nueva?planeacion_id=${plan.id}&grado=${displayGrade || ""}&area=${encodeURIComponent(plan.area)}&tipo=${isPruebaEstandarizada ? "estandarizada" : "abierta"}`}
            >
              <Button
                variant="default"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Evaluar esta actividad
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10 text-xs"
            >
              Cerrar
            </Button>
          {(viewMode === "document" || viewMode === "docente-prueba") && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = buildPdfUrl(displayGrade, viewMode === "docente-prueba");
                    if (url) window.open(url.replace(/#.*$/, ""), "_blank");
                  }}
                  className="border-white/10 text-xs text-primary bg-primary/10 hover:bg-primary/20"
                >
                  <Maximize2 className="w-4 h-4 mr-1" />
                  Pantalla completa
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const url = buildPdfUrl(displayGrade, viewMode === "docente-prueba");
                    if (!url) return;
                    const cleanUrl = url.replace(/#.*$/, "");
                    const a = document.createElement("a");
                    a.href = cleanUrl;
                    a.download = isPruebaEstandarizada
                      ? `Prueba_Grado_${displayGrade}${viewMode === "docente-prueba" ? "_clave" : ""}.pdf`
                      : `Actividad_Grado_${displayGrade}.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="border-white/10 text-xs border-emerald-500/20 text-emerald-500 bg-emerald-600/10 hover:bg-emerald-600/20"
                >
                  <Download className="w-4 h-4 mr-1" />
                  Descargar PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
