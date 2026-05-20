"use client";

import { use, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Target,
  ListChecks,
  BookOpen,
  Layers,
  Star,
  GraduationCap,
  CheckCircle,
  Clock,
  Edit,
  Download,
  Loader2,
  AlertCircle,
  Save,
  X,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Printer,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AREA_COLORS } from "@/lib/types";
import { usePlaneaciones } from "@/hooks/usePlaneaciones";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const formatLatex = (text: string) => {
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
};

export default function PlaneacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { fetchPlaneacion, validatePlaneacion, generatePlaneacion, generateActividad } = usePlaneaciones();
  const [plan, setPlan] = useState<any | null>(null);

  // Estados de interacción local
  const [pageError, setPageError] = useState<string | null>(null);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");
  const [isGeneratingActividad, setIsGeneratingActividad] = useState(false);
  const [isActividadDialogOpen, setIsActividadDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"student" | "teacher">("student");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setIsPageLoading(true);
    setPageError(null);
    fetchPlaneacion(id)
      .then((data) => {
        setPlan(data);
        setIsPageLoading(false);
      })
      .catch((err) => {
        setPageError(err.message || "Error al cargar la planeación");
        setIsPageLoading(false);
      });
  }, [id, fetchPlaneacion]);

  if (isPageLoading && !plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Cargando planeación...</p>
      </div>
    );
  }

  if (pageError || !plan) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <p className="text-muted-foreground">{pageError || "No se encontró la planeación"}</p>
        <Link href="/planeacion">
          <Button variant="outline">Volver a planeaciones</Button>
        </Link>
      </div>
    );
  }

  const content = plan.contenido_generado;
  
  // Si el contenido es un string (markdown), lo manejamos diferente a si es un objeto
  const isObject = typeof content === "object";

  const startEditing = () => {
    setEditedContent(JSON.parse(JSON.stringify(plan.contenido_generado)));
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(null);
  };

  const handleSaveManual = async () => {
    setIsSaving(true);
    try {
      const updatedPlan = await validatePlaneacion(
        id,
        plan.validada_docente,
        plan.correcciones,
        editedContent
      );
      setPlan(updatedPlan);
      setIsEditing(false);
      setEditedContent(null);
      toast.success("Planeación guardada con éxito");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al guardar la planeación");
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async () => {
    setIsSaving(true);
    try {
      const updatedPlan = await validatePlaneacion(id, true, plan.correcciones);
      setPlan(updatedPlan);
      toast.success("Planeación aprobada con éxito");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al aprobar la planeación");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefineAI = async () => {
    if (!aiFeedback.trim()) return;
    setIsRefining(true);
    setIsDialogOpen(false);
    try {
      const newPlan = await generatePlaneacion({
        area: plan.area,
        grados: plan.grados,
        tema: plan.tema,
        duracion: plan.duracion || 2,
        recursos: plan.recursos || "",
        parent_plan_id: id,
        feedback: aiFeedback,
      });
      toast.success("Nueva planeación generada con éxito");
      router.push(`/planeacion/${newPlan.id}`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al refinar la planeación");
      setIsRefining(false);
    }
  };

  const handleGenerateActividad = async () => {
    setIsGeneratingActividad(true);
    try {
      const updatedPlan = await generateActividad(id);
      setPlan(updatedPlan);
      setIsActividadDialogOpen(true);
      toast.success("Actividad evaluativa generada con éxito");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al generar la actividad");
    } finally {
      setIsGeneratingActividad(false);
    }
  };

  const handleCopyActividad = () => {
    if (!plan.actividad_generada) return;
    let textToCopy = `${plan.actividad_generada.titulo}\n\nInstrucciones: ${plan.actividad_generada.instrucciones}\n\n`;
    plan.grados?.forEach((g: number) => {
      const gradeContent = plan.actividad_generada.contenido_grados?.[g] || plan.actividad_generada.contenido_grados?.[g.toString()];
      if (gradeContent) {
        textToCopy += `--- GRADO ${g} ---\n${gradeContent}\n\n`;
      }
    });
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (!plan.actividad_generada) return;
    let printContent = "";
    plan.grados?.forEach((g: number) => {
      const gradeContent = plan.actividad_generada.contenido_grados?.[g] || plan.actividad_generada.contenido_grados?.[g.toString()];
      if (gradeContent) {
        printContent += `
          <div class="grade-container">
            <span style="font-weight: bold; background: #f3f4f6; color: #1f2937; padding: 4px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase; border: 1px solid #e5e7eb;">Grado ${g}</span>
            <div class="markdown-container" style="margin-top: 16px; margin-bottom: 32px; font-size: 14px;">
              <script type="text/markdown">${gradeContent}</script>
            </div>
          </div>
        `;
      }
    });

    const windowUrl = "about:blank";
    const uniqueName = new Date();
    const windowName = "Print" + uniqueName.getTime();
    const printWindow = window.open(windowUrl, windowName, "left=50000,top=50000,width=0,height=0");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${plan.actividad_generada.titulo || "Actividad Evaluativa"}</title>
            <!-- Cargar KaTeX (LaTeX) -->
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
            
            <!-- Cargar Marked (Markdown) -->
            <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
            
            <style>
              body {
                font-family: system-ui, -apple-system, sans-serif;
                margin: 40px;
                color: #111827;
                line-height: 1.6;
              }
              h1 { font-size: 22px; font-weight: bold; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 16px; text-align: center; }
              h2 { font-size: 16px; font-weight: bold; margin-top: 20px; border-bottom: 1px solid #f3f4f6; padding-bottom: 4px; }
              h3 { font-size: 13px; font-weight: bold; margin-top: 14px; }
              p, li { font-size: 13.5px; color: #374151; }
              pre { background-color: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; font-family: monospace; font-size: 12.5px; border: 1px solid #e5e7eb; }
              code { font-family: monospace; background-color: #f3f4f6; padding: 2px 4px; border-radius: 4px; font-size: 12.5px; }
              ul, ol { margin-left: 20px; margin-bottom: 12px; }
              li { margin-bottom: 4px; }
              .header-info { display: flex; justify-content: space-between; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; margin-bottom: 24px; font-size: 12px; }
              .header-info div { display: flex; flex-direction: column; }
              .header-info label { font-weight: 600; color: #6b7280; }
              .header-info span { color: #111827; }
              blockquote { border-left: 4px solid #d1d5db; padding-left: 12px; margin-left: 0; font-style: italic; color: #4b5563; }
              
              /* Estilo de Tablas (Cajas de Respuesta) */
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 16px 0;
                page-break-inside: avoid;
              }
              th, td {
                border: 1px solid #9ca3af;
                padding: 12px;
                text-align: left;
                font-size: 13px;
              }
              th {
                background-color: #f3f4f6;
                font-weight: 600;
                color: #1f2937;
              }
              td {
                color: #374151;
              }
              
              /* Evitar saltos de página incómodos */
              p, li, tr, blockquote {
                page-break-inside: avoid;
              }
              
              .grade-container {
                page-break-after: always;
                margin-bottom: 40px;
              }
              .grade-container:last-child {
                page-break-after: avoid;
              }
              
              @media print {
                body { margin: 20px; }
                @page { margin: 1.5cm; }
              }
            </style>
          </head>
          <body>
            <h1>${plan.actividad_generada.titulo || "Actividad Evaluativa"}</h1>
            <div class="header-info">
              <div>
                <label>Estudiante:</label>
                <span>______________________________________</span>
              </div>
              <div>
                <label>Fecha:</label>
                <span>____________________</span>
              </div>
              <div>
                <label>Área:</label>
                <span>${plan.area}</span>
              </div>
              <div>
                <label>Tema:</label>
                <span>${plan.tema}</span>
              </div>
            </div>
            <div class="markdown-container" style="font-style: italic; margin-bottom: 24px; font-size: 13.5px; color: #4b5563;">
              <script type="text/markdown">${plan.actividad_generada.instrucciones || ""}</script>
            </div>
            ${printContent}
            
            <script>
              // Enmascarar LaTeX para proteger los backslashes del parser Markdown
              var latexPlaceholders = [];
              document.querySelectorAll(".markdown-container").forEach(function(el) {
                var scriptEl = el.querySelector("script");
                if (scriptEl) {
                  var rawText = scriptEl.textContent || scriptEl.innerText;
                  
                  // Guardar expresiones LaTeX y reemplazarlas temporalmente
                  var processedText = rawText.replace(/\\\\?\\[([\\s\\S]*?)\\\\?\\]|\\\\?\\(([\\s\\S]*?)\\\\?\\)/g, function(match) {
                    latexPlaceholders.push(match);
                    return '@@LATEX_PLACEHOLDER_' + (latexPlaceholders.length - 1) + '@@';
                  });
                  
                  // Parsear Markdown
                  var html = marked.parse(processedText);
                  
                  // Restaurar expresiones LaTeX
                  latexPlaceholders.forEach(function(placeholder, index) {
                    html = html.replace('@@LATEX_PLACEHOLDER_' + index + '@@', placeholder);
                  });
                  
                  el.innerHTML = html;
                }
              });
              
              // Renderizar Matemáticas con KaTeX
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
              
              // Desencadenar impresión
              setTimeout(function() {
                window.print();
                window.close();
              }, 600);
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
    }
  };

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

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto relative">
      {/* Overlay de carga premium */}
      {(isSaving || isRefining) && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4 animate-fade-in">
          <div className="relative flex items-center justify-center">
            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            <Sparkles className="w-6 h-6 text-primary animate-pulse absolute" />
          </div>
          <div className="text-center space-y-1">
            <h3 className="font-bold text-lg text-foreground">
              {isRefining ? "Ajustando planeación con IA..." : "Guardando cambios..."}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs px-4">
              {isRefining 
                ? "Estamos aplicando tu retroalimentación para reescribir la planeación curricular." 
                : "Actualizando la planeación curricular en el servidor."}
            </p>
          </div>
        </div>
      )}

      <Link href="/planeacion" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in">
        <ArrowLeft className="w-4 h-4" />
        Volver a planeaciones
      </Link>

      {/* Header */}
      <div className="animate-slide-up">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge className={`${AREA_COLORS[plan.area] || "bg-muted"} border-0`}>
                {plan.area}
              </Badge>
              {plan.validada_docente ? (
                <Badge className="bg-emerald-500/15 text-emerald-500 border-0">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Validada
                </Badge>
              ) : (
                <Badge className="bg-amber-500/15 text-amber-500 border-0">
                  <Clock className="w-3 h-3 mr-1" />
                  Pendiente
                </Badge>
              )}
            </div>
            <h2 className="text-xl font-bold">{plan.tema}</h2>
            <div className="flex flex-wrap gap-1">
              {plan.grados?.map((g: number) => (
                <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">
                  Grado {g}
                </span>
              ))}
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {isEditing ? (
              <>
                <Button 
                  onClick={handleSaveManual} 
                  disabled={isSaving}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-1" />
                  Guardar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancelEdit} 
                  disabled={isSaving}
                  className="border-white/10 text-xs"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
              </>
            ) : (
              <>
                {!plan.validada_docente && (
                  <Button
                    onClick={handleApprove}
                    disabled={isSaving}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs"
                    size="sm"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Aprobar
                  </Button>
                )}
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  variant="outline"
                  className="border-white/10 text-xs bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                  size="sm"
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  Ajustar con IA
                </Button>
                {plan.actividad_generada ? (
                  <Button
                    onClick={() => setIsActividadDialogOpen(true)}
                    variant="outline"
                    className="border-white/10 text-xs bg-emerald-600/10 hover:bg-emerald-600/20 border-emerald-500/20 text-emerald-500"
                    size="sm"
                  >
                    <BookOpen className="w-4 h-4 mr-1" />
                    Ver Actividad
                  </Button>
                ) : (
                  <Button
                    onClick={handleGenerateActividad}
                    disabled={isGeneratingActividad}
                    variant="outline"
                    className="border-white/10 text-xs bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                    size="sm"
                  >
                    {isGeneratingActividad ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Generando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        Generar Actividad
                      </>
                    )}
                  </Button>
                )}
                <Button 
                  onClick={startEditing}
                  variant="outline" 
                  size="sm" 
                  className="border-white/10 text-xs"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button variant="outline" size="sm" className="border-white/10 text-xs">
                  <Download className="w-4 h-4 mr-1" />
                  Exportar
                </Button>
              </>
            )}
          </div>
        </div>

        {plan.correcciones && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm">
            <p className="font-medium text-amber-500 mb-1">Correcciones del docente:</p>
            <p className="text-muted-foreground">{plan.correcciones}</p>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {isEditing ? (
          isObject ? (
            <>
              {/* Objetivo */}
              <Card className="glass-card border-primary/20 animate-slide-up">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Target className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">Objetivo de Aprendizaje</h3>
                  </div>
                  <div className="pl-9">
                    <Textarea
                      value={editedContent.objetivo || ""}
                      onChange={(e) => setEditedContent({ ...editedContent, objetivo: e.target.value })}
                      className="bg-black/20 border-white/10 text-foreground text-sm min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* DBA Citado */}
              <Card className="glass-card border-primary/20 animate-slide-up">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <GraduationCap className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">DBA Citado</h3>
                  </div>
                  <div className="pl-9">
                    <Textarea
                      value={editedContent.dba_citado || ""}
                      onChange={(e) => setEditedContent({ ...editedContent, dba_citado: e.target.value })}
                      className="bg-black/20 border-white/10 text-foreground text-sm min-h-[80px]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Indicadores de Logro */}
              <Card className="glass-card border-primary/20 animate-slide-up">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <ListChecks className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">Indicadores de Logro</h3>
                  </div>
                  <div className="pl-9 space-y-2">
                    {editedContent.indicadores?.map((ind: any, index: number) => (
                      <div key={index} className="flex gap-2 items-center">
                        <select
                          value={ind.grado}
                          onChange={(e) => {
                            const newInds = [...editedContent.indicadores];
                            newInds[index] = { ...ind, grado: parseInt(e.target.value) };
                            setEditedContent({ ...editedContent, indicadores: newInds });
                          }}
                          className="bg-black/40 border border-white/10 rounded-md px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary shrink-0 h-10 w-24"
                        >
                          {plan.grados?.map((g: number) => (
                            <option key={g} value={g} className="bg-neutral-900 text-foreground">Grado {g}</option>
                          ))}
                        </select>
                        <Input
                          value={ind.indicador}
                          onChange={(e) => {
                            const newInds = [...editedContent.indicadores];
                            newInds[index] = { ...ind, indicador: e.target.value };
                            setEditedContent({ ...editedContent, indicadores: newInds });
                          }}
                          className="bg-black/20 border-white/10 text-foreground text-sm h-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            const newInds = editedContent.indicadores.filter((_: any, i: number) => i !== index);
                            setEditedContent({ ...editedContent, indicadores: newInds });
                          }}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/15 h-10 w-10 shrink-0 border border-white/5"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const firstGrade = plan.grados?.[0] || 1;
                        const newInds = [...(editedContent.indicadores || []), { grado: firstGrade, indicador: "" }];
                        setEditedContent({ ...editedContent, indicadores: newInds });
                      }}
                      className="mt-2 text-xs border-white/10 hover:bg-white/5"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Agregar Indicador
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Actividades */}
              <Card className="glass-card border-primary/20 animate-slide-up">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <BookOpen className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">Actividades</h3>
                  </div>
                  <div className="pl-9 space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-emerald-400 mb-1 block">🟢 Apertura:</label>
                      <Textarea
                        value={editedContent.actividades?.apertura || ""}
                        onChange={(e) => setEditedContent({
                          ...editedContent,
                          actividades: { ...(editedContent.actividades || {}), apertura: e.target.value }
                        })}
                        className="bg-black/20 border-white/10 text-foreground text-sm min-h-[80px]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-blue-400 mb-1 block">🔵 Desarrollo:</label>
                      <Textarea
                        value={editedContent.actividades?.desarrollo || ""}
                        onChange={(e) => setEditedContent({
                          ...editedContent,
                          actividades: { ...(editedContent.actividades || {}), desarrollo: e.target.value }
                        })}
                        className="bg-black/20 border-white/10 text-foreground text-sm min-h-[120px]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-amber-400 mb-1 block">🟠 Cierre:</label>
                      <Textarea
                        value={editedContent.actividades?.cierre || ""}
                        onChange={(e) => setEditedContent({
                          ...editedContent,
                          actividades: { ...(editedContent.actividades || {}), cierre: e.target.value }
                        })}
                        className="bg-black/20 border-white/10 text-foreground text-sm min-h-[80px]"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Diferenciación Multigrado */}
              <Card className="glass-card border-primary/20 animate-slide-up">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Layers className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">Diferenciación Multigrado</h3>
                  </div>
                  <div className="pl-9">
                    <Textarea
                      value={editedContent.diferenciacion || ""}
                      onChange={(e) => setEditedContent({ ...editedContent, diferenciacion: e.target.value })}
                      className="bg-black/20 border-white/10 text-foreground text-sm min-h-[100px]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Criterios de Evaluación */}
              <Card className="glass-card border-primary/20 animate-slide-up">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Star className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">Criterios de Evaluación</h3>
                  </div>
                  <div className="pl-9">
                    <Textarea
                      value={editedContent.criterios_evaluacion || ""}
                      onChange={(e) => setEditedContent({ ...editedContent, criterios_evaluacion: e.target.value })}
                      className="bg-black/20 border-white/10 text-foreground text-sm min-h-[100px]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Estándar MEN */}
              <Card className="glass-card border-primary/20 animate-slide-up">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <GraduationCap className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm">Estándar MEN</h3>
                  </div>
                  <div className="pl-9">
                    <Textarea
                      value={editedContent.estandar_men || ""}
                      onChange={(e) => setEditedContent({ ...editedContent, estandar_men: e.target.value })}
                      className="bg-black/20 border-white/10 text-foreground text-sm min-h-[100px]"
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="glass-card border-primary/20 animate-slide-up">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">Contenido de la Planeación</h3>
                </div>
                <div className="pl-9">
                  <Textarea
                    value={editedContent || ""}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="bg-black/20 border-white/10 text-foreground text-sm min-h-[400px]"
                  />
                </div>
              </CardContent>
            </Card>
          )
        ) : (
          sections.map((section, i) => (
            <Card
              key={i}
              className="glass-card border-white/5 animate-slide-up"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <section.icon className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{section.title}</h3>
                </div>
                <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed pl-9">
                  {section.content}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Metadata footer */}
      <Card className="glass-card border-white/5 animate-slide-up">
        <CardContent className="p-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>Agente: <strong className="text-foreground">{plan.agente_usado}</strong></span>
          <span>Tokens: <strong className="text-foreground">{plan.tokens_consumidos || 0}</strong></span>
          <span>DBA: <strong className="text-foreground">{plan.dba_referenciados?.join(", ") || "N/A"}</strong></span>
          <span>Creada: <strong className="text-foreground">{new Date(plan.created_at).toLocaleDateString("es-CO")}</strong></span>
        </CardContent>
      </Card>

      {/* Diálogo para ajuste con IA */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-white/10 bg-neutral-900/95 text-foreground max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Sparkles className="w-5 h-5 text-primary" />
              Ajustar con IA
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Escribe qué te gustaría cambiar de esta planeación. La IA mantendrá la base y aplicará tus comentarios.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Ej: Modifica la actividad de desarrollo para que sea un juego al aire libre en vez de lectura..."
              value={aiFeedback}
              onChange={(e) => setAiFeedback(e.target.value)}
              className="bg-black/40 border-white/10 text-sm min-h-[120px] focus:border-primary"
            />
          </div>
          <DialogFooter className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setAiFeedback("");
              }}
              className="border-white/10 text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRefineAI}
              disabled={!aiFeedback.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
            >
              Aplicar Ajustes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Actividad Evaluativa */}
      <Dialog open={isActividadDialogOpen} onOpenChange={setIsActividadDialogOpen}>
        <DialogContent className="glass-card border-white/10 bg-neutral-900/95 text-foreground max-w-3xl w-full h-[85vh] flex flex-col p-6 overflow-hidden">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <BookOpen className="w-5 h-5 text-emerald-500" />
              {plan.actividad_generada?.titulo || "Actividad Evaluativa"}
            </DialogTitle>
            <DialogDescription className="text-xs text-neutral-400">
              Taller práctico evaluativo diseñado específicamente para esta planeación curricular.
            </DialogDescription>
          </DialogHeader>

          {/* Selector de pestañas */}
          <div className="flex gap-2 border-b border-white/10 pb-3 mt-4 flex-shrink-0">
            <button
              onClick={() => setActiveTab("student")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "student"
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-white/5 text-muted-foreground border border-transparent hover:bg-white/10"
              }`}
            >
              Vista Dashboard
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "preview"
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/5 text-muted-foreground border border-transparent hover:bg-white/10"
              }`}
            >
              Vista Previa Impresión
            </button>
            <button
              onClick={() => setActiveTab("teacher")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "teacher"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/5 text-muted-foreground border border-transparent hover:bg-white/10"
              }`}
            >
              Solucionario (Docente)
            </button>
          </div>

          {/* Contenido scrolleable */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
            {activeTab === "student" ? (
              <div className="space-y-6">
                <div className="p-4 rounded-xl border border-white/5 bg-white/5">
                  <p className="text-xs font-semibold text-muted-foreground/60 uppercase mb-2">Instrucciones Generales:</p>
                  <div className="text-sm italic leading-relaxed text-muted-foreground">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {formatLatex(plan.actividad_generada?.instrucciones)}
                    </ReactMarkdown>
                  </div>
                </div>

                <div className="space-y-4">
                  {plan.grados?.map((g: number) => {
                    const gradeContent = plan.actividad_generada?.contenido_grados?.[g] || plan.actividad_generada?.contenido_grados?.[g.toString()];
                    if (!gradeContent) return null;
                    return (
                      <div key={g} className="p-5 rounded-xl border border-white/5 bg-black/20 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-bold">
                            Grado {g}
                          </span>
                        </div>
                        <div className="text-sm text-neutral-300 leading-relaxed bg-black/40 p-5 rounded-lg border border-white/5 markdown-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                              h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-4 mb-2 text-primary" {...props} />,
                              h2: ({node, ...props}) => <h2 className="text-base font-semibold mt-3 mb-2 text-foreground" {...props} />,
                              h3: ({node, ...props}) => <h3 className="text-sm font-medium mt-2 mb-1 text-foreground/90" {...props} />,
                              p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed text-muted-foreground" {...props} />,
                              ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1 text-muted-foreground" {...props} />,
                              ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-muted-foreground" {...props} />,
                              li: ({node, ...props}) => <li className="text-sm my-1" {...props} />,
                              code: ({node, ...props}) => <code className="bg-black/35 px-1.5 py-0.5 rounded text-xs font-mono text-primary" {...props} />,
                              pre: ({node, ...props}) => <pre className="bg-black/60 p-4 rounded-lg border border-white/5 overflow-x-auto my-3 text-xs font-mono" {...props} />,
                              blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary/40 pl-4 italic my-3 text-muted-foreground" {...props} />,
                              table: ({node, ...props}) => <table className="w-full border-collapse border border-white/10 my-4" {...props} />,
                              th: ({node, ...props}) => <th className="border border-white/10 bg-white/5 p-3 text-left font-semibold text-xs text-primary" {...props} />,
                              td: ({node, ...props}) => <td className="border border-white/10 p-3 text-left text-sm text-neutral-300" {...props} />
                            }}
                          >
                            {formatLatex(gradeContent)}
                          </ReactMarkdown>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : activeTab === "preview" ? (
              <div className="flex justify-center bg-neutral-950 p-4 rounded-xl border border-white/5">
                <div className="bg-white text-black p-8 sm:p-12 shadow-2xl w-full max-w-[800px] min-h-[1056px] font-sans">
                  <h1 className="text-2xl font-bold border-b-2 border-gray-300 pb-2 mb-6 text-center text-gray-900">
                    {plan.actividad_generada?.titulo || "Actividad Evaluativa"}
                  </h1>
                  
                  <div className="flex justify-between border border-gray-300 p-4 rounded-lg mb-8 text-sm">
                    <div className="flex flex-col gap-3">
                      <div><span className="font-semibold text-gray-600 mr-2">Estudiante:</span> <span>_________________________________</span></div>
                      <div><span className="font-semibold text-gray-600 mr-2">Fecha:</span> <span>____________________</span></div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div><span className="font-semibold text-gray-600 mr-2">Área:</span> <span className="text-gray-900">{plan.area}</span></div>
                      <div><span className="font-semibold text-gray-600 mr-2">Tema:</span> <span className="text-gray-900">{plan.tema}</span></div>
                    </div>
                  </div>

                  <div className="italic text-gray-700 mb-8 text-[14.5px]">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {formatLatex(plan.actividad_generada?.instrucciones || "")}
                    </ReactMarkdown>
                  </div>

                  <div className="space-y-12">
                    {plan.grados?.map((g: number) => {
                      const gradeContent = plan.actividad_generada?.contenido_grados?.[g] || plan.actividad_generada?.contenido_grados?.[g.toString()];
                      if (!gradeContent) return null;
                      return (
                        <div key={g} className="space-y-4">
                          <div className="inline-block px-3 py-1 bg-gray-100 text-gray-800 font-bold text-xs uppercase rounded border border-gray-200">
                            Grado {g}
                          </div>
                          <div className="text-[14.5px] text-gray-900 leading-relaxed print-preview-markdown">
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                              components={{
                                h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-6 mb-3 text-black" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-lg font-semibold mt-5 mb-2 text-gray-800 border-b border-gray-100 pb-1" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-base font-medium mt-4 mb-2 text-gray-800" {...props} />,
                                p: ({node, ...props}) => <p className="mb-4 last:mb-0" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
                                li: ({node, ...props}) => <li className="my-1" {...props} />,
                                code: ({node, ...props}) => <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800" {...props} />,
                                pre: ({node, ...props}) => <pre className="bg-gray-50 p-4 rounded border border-gray-200 overflow-x-auto my-4 text-sm font-mono text-gray-800" {...props} />,
                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600" {...props} />,
                                table: ({node, ...props}) => <table className="w-full border-collapse border border-gray-400 my-4" {...props} />,
                                th: ({node, ...props}) => <th className="border border-gray-400 bg-gray-100 p-3 text-left font-semibold text-xs text-gray-800" {...props} />,
                                td: ({node, ...props}) => <td className="border border-gray-400 p-3 text-left text-[13.5px] text-gray-900 leading-normal" {...props} />
                              }}
                            >
                              {formatLatex(gradeContent)}
                            </ReactMarkdown>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-xl border border-emerald-500/10 bg-emerald-500/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm text-emerald-400">Guía de Respuestas y Criterios de Calificación</h4>
                  <Link href={`/evaluacion/nueva?area=${encodeURIComponent(plan.area)}&tipo=abierta`}>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs">
                      Calificar con Gemini Vision
                    </Button>
                  </Link>
                </div>
                <div className="text-sm text-neutral-300 leading-relaxed bg-black/40 p-5 rounded-lg border border-white/5 markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-lg font-bold mt-4 mb-2 text-emerald-400" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-base font-semibold mt-3 mb-2 text-foreground" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-sm font-medium mt-2 mb-1 text-foreground/90" {...props} />,
                      p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed text-muted-foreground" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1 text-muted-foreground" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1 text-muted-foreground" {...props} />,
                      li: ({node, ...props}) => <li className="text-sm my-1" {...props} />,
                      code: ({node, ...props}) => <code className="bg-black/35 px-1.5 py-0.5 rounded text-xs font-mono text-emerald-400" {...props} />,
                      pre: ({node, ...props}) => <pre className="bg-black/60 p-4 rounded-lg border border-white/5 overflow-x-auto my-3 text-xs font-mono" {...props} />,
                      table: ({node, ...props}) => <table className="w-full border-collapse border border-white/10 my-4" {...props} />,
                      th: ({node, ...props}) => <th className="border border-white/10 bg-white/5 p-3 text-left font-semibold text-xs text-emerald-400" {...props} />,
                      td: ({node, ...props}) => <td className="border border-white/10 p-3 text-left text-sm text-neutral-300" {...props} />
                    }}
                  >
                    {formatLatex(plan.actividad_generada?.clave_respuestas)}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>

          {/* Footer del diálogo */}
          <div className="flex justify-between items-center border-t border-white/10 pt-4 flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              {activeTab === "teacher" 
                ? "👀 Guarda el solucionario de forma confidencial." 
                : activeTab === "preview" 
                ? "🖨️ Así se verá tu documento al imprimirlo."
                : "⚠️ Esta vista es para revisar el contenido cómodamente en pantalla."}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsActividadDialogOpen(false)}
                className="border-white/10 text-xs"
              >
                Cerrar
              </Button>
              {activeTab !== "teacher" && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCopyActividad}
                    className="border-white/10 text-xs"
                  >
                    <Copy className="w-4 h-4 mr-1" />
                    {copied ? "Copiado" : "Copiar"}
                  </Button>
                  <Button
                    onClick={handlePrint}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs"
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    Imprimir
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
