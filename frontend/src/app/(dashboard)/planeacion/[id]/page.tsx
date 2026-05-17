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
} from "lucide-react";
import Link from "next/link";
import { AREA_COLORS } from "@/lib/types";
import { usePlaneaciones } from "@/hooks/usePlaneaciones";

export default function PlaneacionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { fetchPlaneacion, isLoading, error } = usePlaneaciones();
  const [plan, setPlan] = useState<any | null>(null);

  useEffect(() => {
    fetchPlaneacion(id).then(setPlan).catch(() => {});
  }, [id, fetchPlaneacion]);

  if (isLoading && !plan) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Cargando planeación...</p>
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <p className="text-muted-foreground">{error || "No se encontró la planeación"}</p>
        <Link href="/planeacion">
          <Button variant="outline">Volver a planeaciones</Button>
        </Link>
      </div>
    );
  }

  const content = plan.contenido_generado;
  
  // Si el contenido es un string (markdown), lo manejamos diferente a si es un objeto
  const isObject = typeof content === "object";

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
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl mx-auto">
      <Link href="/planeacion" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in">
        <ArrowLeft className="w-4 h-4" />
        Volver a planeaciones
      </Link>

      {/* Header */}
      <div className="animate-slide-up">
        <div className="flex items-start justify-between">
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
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-white/10">
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </Button>
            <Button variant="outline" size="sm" className="border-white/10">
              <Download className="w-4 h-4 mr-1" />
              Exportar
            </Button>
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
        {sections.map((section, i) => (
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
        ))}
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
    </div>
  );
}
