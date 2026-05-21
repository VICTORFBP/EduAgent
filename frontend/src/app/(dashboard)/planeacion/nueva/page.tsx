"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Loader2,
  ArrowLeft,
  BookOpen,
  Target,
  ListChecks,
  Layers,
  Star,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { AREAS, GRADOS } from "@/lib/types";
import { usePlaneaciones } from "@/hooks/usePlaneaciones";
import { toast } from "sonner";

export default function NuevaPlaneacionPage() {
  const router = useRouter();
  const [area, setArea] = useState("");
  const [grados, setGrados] = useState<number[]>([]);
  const [tema, setTema] = useState("");
  const [recursos, setRecursos] = useState("");
  const [tipoActividad, setTipoActividad] = useState("");
  
  const { generatePlaneacion, isLoading, error } = usePlaneaciones();
  const [generatedPlan, setGeneratedPlan] = useState<any | null>(null);
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["objetivo", "actividades", "indicadores", "diferenciacion", "evaluacion", "dba"])
  );

  const toggleGrado = (g: number) => {
    setGrados((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g].sort()
    );
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!area || grados.length === 0 || !tema.trim()) return;

    try {
      const result = await generatePlaneacion({
        area,
        grados,
        tema,
        recursos,
        tipoActividad: tipoActividad.trim() || undefined,
      });
      setGeneratedPlan(result);
      toast.success("Planeación generada correctamente");
    } catch (err) {
      toast.error("Error al generar la planeación");
    }
  };

  const canGenerate = area && grados.length > 0 && tema.trim();

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      {/* Back */}
      <Link href="/planeacion" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in">
        <ArrowLeft className="w-4 h-4" />
        Volver a planeaciones
      </Link>

      {/* Form */}
      {!generatedPlan && (
        <Card className="glass-card border-white/5 animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Nueva Planeación con IA
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              El agente RAG generará una planeación alineada con los DBA del MEN para tu contexto multigrado.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Área */}
            <div className="space-y-2">
              <Label htmlFor="area">Área</Label>
              <Select value={area} onValueChange={(v) => v && setArea(v)}>
                <SelectTrigger id="area" className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Selecciona un área" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Grados */}
            <div className="space-y-2">
              <Label>Grados</Label>
              <div className="flex flex-wrap gap-2">
                {GRADOS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGrado(g)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                      grados.includes(g)
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    <Checkbox checked={grados.includes(g)} className="pointer-events-none" />
                    Grado {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Tema */}
            <div className="space-y-2">
              <Label htmlFor="tema">Tema</Label>
              <input
                id="tema"
                placeholder="Ej: Sumas y restas con material concreto"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                className="w-full h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Recursos */}
            <div className="space-y-2">
              <Label htmlFor="recursos">Recursos disponibles (opcional)</Label>
              <Textarea
                id="recursos"
                placeholder="Ej: Semillas, piedras, cuadernos, colores, tablero..."
                value={recursos}
                onChange={(e) => setRecursos(e.target.value)}
                className="bg-white/5 border-white/10 min-h-[80px]"
              />
            </div>

            {/* Tipo de Actividad */}
            <div className="space-y-2">
              <Label htmlFor="tipo-actividad" className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Tipo de actividad o instrucciones específicas
                <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
              </Label>
              <Textarea
                id="tipo-actividad"
                placeholder={`Ej: Quiero 4 ejercicios de sumas con espacio para el procedimiento y 2 problemas de resolución.\nEj: Un cuento de una página con preguntas de verdadero/falso y selección múltiple.`}
                value={tipoActividad}
                onChange={(e) => setTipoActividad(e.target.value)}
                className="bg-white/5 border-white/10 min-h-[110px] text-sm"
              />
              <p className="text-xs text-muted-foreground">
                La IA usará estas instrucciones para personalizar el formato de la actividad generada.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={!canGenerate || isLoading}
              className="w-full h-12 gradient-primary text-white font-medium hover:opacity-90 transition-opacity text-base"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generando planeación con IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generar Planeación
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Generated Plan */}
      {generatedPlan && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Planeación Generada
            </h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-white/10" onClick={() => setGeneratedPlan(null)}>
                Nueva consulta
              </Button>
              <Link href="/planeacion">
                <Button size="sm" className="gradient-primary text-white">
                  Ver mis planeaciones
                </Button>
              </Link>
            </div>
          </div>

          <Card className="glass-card border-white/5 overflow-hidden">
            <CardContent className="p-0">
               <div className="p-6 border-b border-white/5">
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge className="bg-primary/15 text-primary border-0 text-xs">
                    {generatedPlan.area}
                  </Badge>
                  {generatedPlan.grados?.map((g: number) => (
                    <Badge key={g} variant="secondary" className="border-0 text-xs">
                      Grado {g}
                    </Badge>
                  ))}
                  <Badge variant="outline" className="border-white/10 text-[10px]">
                    {generatedPlan.agente_usado}
                  </Badge>
                </div>
                <h1 className="text-xl font-bold">{generatedPlan.tema}</h1>
              </div>

              <div className="divide-y divide-white/5">
                {(() => {
                  const content = generatedPlan.contenido_generado;
                  const isObject = typeof content === "object" && content !== null;

                  const sections = isObject ? [
                    { icon: Target, title: "Objetivo de Aprendizaje", content: content.objetivo },
                    { icon: GraduationCap, title: "DBA Citado", content: content.dba_citado },
                    {
                      icon: ListChecks,
                      title: "Indicadores de Logro",
                      content: content.indicadores
                        ?.map((ind: any) => `• Grado ${ind.grado}: ${ind.indicador}`)
                        .join("\n") || "No especificado",
                    },
                    {
                      icon: BookOpen,
                      title: "Actividades",
                      content: `🟢 Apertura:\n${content.actividades?.apertura}\n\n🔵 Desarrollo:\n${content.actividades?.desarrollo}\n\n🟠 Cierre:\n${content.actividades?.cierre}`,
                    },
                    { icon: Layers, title: "Diferenciación Multigrado", content: content.diferenciacion },
                    { icon: Star, title: "Criterios de Evaluación", content: content.criterios_evaluacion },
                    { icon: GraduationCap, title: "Estándar MEN", content: content.estandar_men },
                  ] : [
                    { icon: BookOpen, title: "Contenido de la Planeación", content: content }
                  ];

                  return sections.map((section, i) => (
                    <div key={i} className="p-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary/10">
                          <section.icon className="w-4 h-4 text-primary" />
                        </div>
                        <h3 className="font-semibold text-sm">{section.title}</h3>
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed pl-9">
                        {section.content}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
