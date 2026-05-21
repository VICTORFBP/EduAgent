"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, Copy, Printer, ChevronDown } from "lucide-react";
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
  getGradeContent,
  getSkillLabelForArea,
  isPlainMarkdownString,
} from "@/lib/actividad-markdown";
import { openActividadPrintWindow } from "@/lib/actividad-print";

export type ActividadViewMode = "document" | "teacher";

export interface ActividadDialogPlan {
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
  const needsRegenerate =
    claveRaw != null &&
    claveRaw !== "" &&
    !isPlainMarkdownString(claveRaw);

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
            Documento
          </button>
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
        </div>

        <div className="flex-1 overflow-y-auto py-4 pr-1 min-h-0">
          {viewMode === "document" ? (
            <div className="space-y-4">
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
              <div className="flex justify-center bg-neutral-950 p-4 sm:p-6 rounded-xl border border-white/5">
                {displayGrade == null || !gradeContent ? (
                  <p className="text-sm text-muted-foreground p-8">
                    No hay contenido para mostrar.
                  </p>
                ) : (
                  <ActividadDocument
                    titulo={actividad?.titulo || "Actividad Evaluativa"}
                    area={plan.area}
                    tema={plan.tema}
                    grado={displayGrade}
                    instrucciones={actividad?.instrucciones}
                    contenidoGrado={gradeContent}
                    showGradeBadge={actividadGrades.length >= 2}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-[800px] mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-semibold text-sm text-emerald-400">
                  Guía de Respuestas y Criterios de Calificación
                </h4>
                <Link
                  href={`/evaluacion/nueva?area=${encodeURIComponent(plan.area)}&tipo=abierta`}
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
                  content={claveRaw ?? ""}
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
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-white/10 text-xs"
            >
              Cerrar
            </Button>
            {viewMode === "document" && (
              <>
                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="border-white/10 text-xs"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  {copied ? "Copiado" : "Copiar"}
                </Button>
                {actividadGrades.length >= 2 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="inline-flex">
                      <Button className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs">
                        <Printer className="w-4 h-4 mr-1" />
                        Imprimir
                        <ChevronDown className="w-3 h-3 ml-1 opacity-70" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[10rem]">
                      {actividadGrades.map((g) => (
                        <DropdownMenuItem
                          key={g}
                          onClick={() => handlePrint(g)}
                        >
                          Grado {g}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handlePrintAll}>
                        Todos los grados
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Button
                    onClick={() => handlePrint()}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    Imprimir
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
