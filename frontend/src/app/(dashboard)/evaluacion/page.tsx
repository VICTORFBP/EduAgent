"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClipboardCheck,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Filter,
  Loader2,
  Trash2,
  RefreshCcw,
  UserPlus,
} from "lucide-react";
import { useEvaluaciones } from "@/hooks/useEvaluaciones";
import { useEstudiantes } from "@/hooks/useEstudiantes";
import { AREA_COLORS } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Evaluacion } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

function getNotaColor(nota: number | null): string {
  if (nota === null) return "text-muted-foreground";
  if (nota >= 8.0) return "text-emerald-500";
  if (nota >= 6.0) return "text-amber-500";
  return "text-red-500";
}

export default function EvaluacionPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { evaluaciones, isLoading, deleteEvaluacion, retryEvaluacion, calificarManual, getArchivoUrl } = useEvaluaciones();
  const { estudiantes } = useEstudiantes();
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [selectedEvaluacion, setSelectedEvaluacion] = useState<Evaluacion | null>(null);
  const [evalFileUrl, setEvalFileUrl] = useState<string | null>(null);

  // Manual grading state
  const [isManualGrading, setIsManualGrading] = useState(false);
  const [manualNota, setManualNota] = useState("");
  const [manualFeedback, setManualFeedback] = useState("");

  const handleManualGrade = async () => {
    if (!selectedEvaluacion || !manualNota) return;
    try {
      setIsActionLoading("manual-" + selectedEvaluacion.id);
      const updated = await calificarManual(selectedEvaluacion.id, Number(manualNota), manualFeedback);
      setSelectedEvaluacion(updated);
      setIsManualGrading(false);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleOpenModal = async (ev: Evaluacion) => {
    setSelectedEvaluacion(ev);
    setIsManualGrading(false);
    setManualNota(ev.nota !== null ? String(ev.nota) : "");
    setManualFeedback(ev.retroalimentacion || "");
    setEvalFileUrl(null);
    try {
      const url = await getArchivoUrl(ev.id);
      setEvalFileUrl(url);
    } catch {
      setEvalFileUrl(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de eliminar esta evaluación?")) return;
    try {
      setIsActionLoading(id);
      await deleteEvaluacion(id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleRetry = async (id: string) => {
    try {
      setIsActionLoading(id);
      await retryEvaluacion(id);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setIsActionLoading(null);
    }
  };

  const filtered = evaluaciones.filter(
    (e) =>
      (e.estudiante_nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h2 className="text-xl font-bold">Evaluaciones</h2>
          <p className="text-sm text-muted-foreground">
            {evaluaciones.length} evaluaciones procesadas
          </p>
        </div>
        <Link href="/evaluacion/nueva">
          <Button className="gradient-primary text-white hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Evaluación
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 animate-slide-up delay-100">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por estudiante o área..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10"
          />
        </div>
        <Button variant="outline" size="icon" className="border-white/10">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando evaluaciones...</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {filtered.map((ev, i) => (
              <Card
                key={ev.id}
                className="group glass-card border-white/5 hover:border-white/10 transition-all animate-slide-up cursor-pointer"
                style={{ animationDelay: `${(i + 1) * 80}ms` }}
                onClick={() => handleOpenModal(ev as Evaluacion)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${
                        !ev.estudiante_id && ev.procesado_correctamente ? "bg-amber-500/10" : 
                        ev.procesado_correctamente ? "bg-emerald-500/10" : "bg-red-500/10"
                      }`}>
                        {!ev.estudiante_id && ev.procesado_correctamente ? (
                          <AlertCircle className="w-4 h-4 text-amber-500" />
                        ) : ev.procesado_correctamente ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-medium text-sm truncate ${!ev.estudiante_id ? "text-amber-500 font-semibold" : ""}`}>
                          {ev.estudiante_nombre || "Estudiante"}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className={`${AREA_COLORS[ev.area] || "bg-muted"} border-0 text-[10px]`}>
                            {ev.area}
                          </Badge>
                          <Badge variant="outline" className="border-white/10 text-[10px]">
                            {ev.tipo}
                          </Badge>
                          {ev.calificacion_manual && (
                            <Badge className="bg-blue-500/10 text-blue-400 border-0 text-[10px]">Manual</Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{formatDate(ev.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-3 gap-2">
                      {ev.procesado_correctamente && ev.nota !== null && ev.nota !== undefined ? (
                        <p className={`text-2xl font-bold ${getNotaColor(Number(ev.nota))}`}>
                          {Number(ev.nota).toFixed(1)}
                        </p>
                      ) : ev.procesado_correctamente ? (
                        <Badge variant="secondary" className="text-xs">Sin nota</Badge>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                            </span>
                            <span className="text-xs text-amber-500 font-medium">Procesando</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">GPT-4o Vision</p>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetry(ev.id);
                          }}
                          disabled={isActionLoading === ev.id}
                          title="Reintentar evaluación"
                        >
                          <RefreshCcw className={`w-3.5 h-3.5 ${isActionLoading === ev.id ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(ev.id);
                          }}
                          disabled={isActionLoading === ev.id}
                          title="Eliminar evaluación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {ev.retroalimentacion && (
                    <p className="text-xs text-muted-foreground mt-3 pl-11 line-clamp-2">
                      {ev.retroalimentacion}
                    </p>
                  )}
                  {ev.error_ocr && (
                    <p className="text-xs text-red-400 mt-3 pl-11">
                      ⚠️ {ev.error_ocr}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12 space-y-3 animate-fade-in">
              <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <p className="text-muted-foreground">No se encontraron evaluaciones</p>
            </div>
          )}
        </>
      )}

      {/* Modal for Details */}
      <Dialog open={!!selectedEvaluacion} onOpenChange={(open) => !open && setSelectedEvaluacion(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto glass-card border-white/10">
          {selectedEvaluacion && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${
                    !selectedEvaluacion.estudiante_id ? "bg-amber-500/10" :
                    selectedEvaluacion.procesado_correctamente ? "bg-emerald-500/10" : "bg-red-500/10"
                  }`}>
                    {!selectedEvaluacion.estudiante_id ? (
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    ) : selectedEvaluacion.procesado_correctamente ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                  Evaluación de {selectedEvaluacion.estudiante_nombre || "Estudiante"}
                </DialogTitle>
                <DialogDescription className="flex items-center gap-2 flex-wrap">
                  <span>
                    {selectedEvaluacion.calificacion_manual
                      ? "Calificación asignada manualmente por el docente."
                      : "Revisión detallada procesada por GPT-4o Vision."}
                  </span>
                  {!selectedEvaluacion.estudiante_id && selectedEvaluacion.procesado_correctamente && (
                    <span className="text-amber-500 font-medium ml-2">⚠️ Estudiante sin identificar.</span>
                  )}
                  {selectedEvaluacion.calificacion_manual && selectedEvaluacion.nota_ia !== null && (
                    <Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">
                      IA Corregida (Nota original IA: {selectedEvaluacion.nota_ia})
                    </Badge>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4 space-y-6">
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center">
                    <span className="text-sm text-muted-foreground mb-1">Nota Definitiva</span>
                    {selectedEvaluacion.procesado_correctamente && selectedEvaluacion.nota !== null ? (
                      <span className={`text-4xl font-bold ${getNotaColor(Number(selectedEvaluacion.nota))}`}>
                        {Number(selectedEvaluacion.nota).toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-xl font-semibold text-muted-foreground">N/A</span>
                    )}
                    {selectedEvaluacion.calificacion_manual && (
                      <span className="text-[11px] text-blue-400 mt-1">Manual (Docente)</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Área</span>
                      <Badge className={`${AREA_COLORS[selectedEvaluacion.area] || "bg-muted"} border-0`}>
                        {selectedEvaluacion.area}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Tipo</span>
                      <Badge variant="outline" className="border-white/10">
                        {selectedEvaluacion.tipo}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Fecha</span>
                      <span className="font-medium">{formatDate(selectedEvaluacion.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Submission file preview if available */}
                {evalFileUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        📄 Entrega del Estudiante (Foto / PDF)
                      </h4>
                      <a
                        href={evalFileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Abrir archivo original ↗
                      </a>
                    </div>
                    <div className="bg-black/40 border border-white/10 rounded-xl p-2 flex justify-center max-h-56 overflow-hidden">
                      <img
                        src={evalFileUrl}
                        alt="Entrega del estudiante"
                        className="max-h-52 object-contain rounded"
                        onError={(e) => {
                          // In case it's a PDF, hide img or render preview fallback
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}

                {selectedEvaluacion.retroalimentacion && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <ClipboardCheck className="w-4 h-4 text-primary" />
                      Retroalimentación Pedagógica
                    </h4>
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedEvaluacion.retroalimentacion}
                    </div>
                  </div>
                )}

                {selectedEvaluacion.error_ocr && !isManualGrading && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Error en Procesamiento
                    </h4>
                    <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-sm text-red-200 whitespace-pre-wrap">
                      {selectedEvaluacion.error_ocr}
                    </div>
                  </div>
                )}
                
                {isManualGrading ? (
                  <div className="space-y-4 pt-4 border-t border-white/10 animate-fade-in">
                    <h4 className="text-sm font-semibold">Calificación Manual</h4>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Nota (0 - 10)</label>
                      <Input 
                        type="number" 
                        min="0" 
                        max="10" 
                        step="0.1" 
                        value={manualNota} 
                        onChange={(e) => setManualNota(e.target.value)} 
                        className="bg-white/5 border-white/10 max-w-[150px]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Retroalimentación</label>
                      <textarea
                        value={manualFeedback}
                        onChange={(e) => setManualFeedback(e.target.value)}
                        className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="Escribe comentarios para el estudiante..."
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" onClick={() => setIsManualGrading(false)}>Cancelar</Button>
                      <Button 
                        onClick={handleManualGrade} 
                        disabled={!manualNota || isActionLoading === "manual-" + selectedEvaluacion.id}
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        {isActionLoading === "manual-" + selectedEvaluacion.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <ClipboardCheck className="w-4 h-4 mr-2" />
                        )}
                        Guardar Calificación
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 flex justify-end">
                    <Button 
                      variant="outline" 
                      className="border-white/10"
                      onClick={() => setIsManualGrading(true)}
                    >
                      {selectedEvaluacion.nota !== null ? "Corregir Calificación" : "Calificar Manualmente"}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
