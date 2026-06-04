"use client";

import { use, useEffect, useState, useRef } from "react";
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
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AREA_COLORS } from "@/lib/types";
import { usePlaneaciones } from "@/hooks/usePlaneaciones";
import { toast } from "sonner";
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
import dynamic from "next/dynamic";
import { getActividadGradesWithContent } from "@/components/planeacion/ActividadDocument";

const ActividadDialog = dynamic(
  () => import("@/components/planeacion/ActividadDialog").then((mod) => mod.ActividadDialog),
  { ssr: false }
);

export default function PlaneacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    fetchPlaneacion,
    validatePlaneacion,
    generatePlaneacion,
    generateActividad,
    deletePlaneacion,
  } = usePlaneaciones();
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
  const [actividadInitialGrade, setActividadInitialGrade] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

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

  const handleDeletePlaneacion = async () => {
    if (!confirm("¿Eliminar esta planeación? Esta acción no se puede deshacer.")) return;
    setIsDeleting(true);
    try {
      await deletePlaneacion(id);
      toast.success("Planeación eliminada");
      router.push("/planeacion");
    } catch (err: any) {
      toast.error(err.message || "Error al eliminar la planeación");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateActividad = async () => {
    setIsGeneratingActividad(true);
    try {
      const response = await generateActividad(id);
      
      if (response?.status === "processing") {
        toast.info("Generando actividad en segundo plano. Esto puede tardar unos segundos...");
        
        let attempts = 0;
        pollingIntervalRef.current = setInterval(async () => {
          try {
            attempts++;
            const updatedPlan = await fetchPlaneacion(id);
            if (updatedPlan.actividad_generada) {
              if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
              setPlan(updatedPlan);
              const grades = getActividadGradesWithContent(updatedPlan);
              setActividadInitialGrade(grades[0] ?? updatedPlan.grados?.[0] ?? null);
              setIsActividadDialogOpen(true);
              setIsGeneratingActividad(false);
              toast.success("Actividad evaluativa generada con éxito");
            } else if (attempts > 40) { // Timeout after 2 minutes
              if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
              setIsGeneratingActividad(false);
              toast.error("La generación tomó demasiado tiempo. Intenta recargar la página más tarde.");
            }
          } catch (err) {
            console.error("Error polling planeacion:", err);
          }
        }, 3000);
        return;
      }

      // Si no es asíncrono (respusta inmediata)
      setPlan(response);
      const grades = getActividadGradesWithContent(response);
      setActividadInitialGrade(grades[0] ?? response.grados?.[0] ?? null);
      setIsActividadDialogOpen(true);
      toast.success("Actividad evaluativa generada con éxito");
      setIsGeneratingActividad(false);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al generar la actividad");
      setIsGeneratingActividad(false);
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
                  <>
                    <Button
                      onClick={() => {
                        const grades = getActividadGradesWithContent(plan);
                        setActividadInitialGrade(grades[0] ?? plan.grados?.[0] ?? null);
                        setIsActividadDialogOpen(true);
                      }}
                      variant="outline"
                      className="border-white/10 text-xs bg-emerald-600/10 hover:bg-emerald-600/20 border-emerald-500/20 text-emerald-500"
                      size="sm"
                    >
                      <BookOpen className="w-4 h-4 mr-1" />
                      Ver Actividad
                    </Button>
                    <Button
                      onClick={() => {
                        if (confirm("¿Estás seguro de regenerar la actividad? Esto sobrescribirá la actividad actual.")) {
                          handleGenerateActividad();
                        }
                      }}
                      disabled={isGeneratingActividad}
                      variant="outline"
                      className="border-white/10 text-xs bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/20 text-amber-500"
                      size="sm"
                    >
                      {isGeneratingActividad ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Regenerando...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Regenerar
                        </>
                      )}
                    </Button>
                  </>
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
                <Button
                  onClick={handleDeletePlaneacion}
                  disabled={isDeleting}
                  variant="outline"
                  size="sm"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10 text-xs"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-1" />
                  )}
                  Eliminar
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

      {plan.actividad_generada && (
        <ActividadDialog
          open={isActividadDialogOpen}
          onOpenChange={setIsActividadDialogOpen}
          plan={plan}
          initialGrade={actividadInitialGrade}
        />
      )}
    </div>
  );
}
