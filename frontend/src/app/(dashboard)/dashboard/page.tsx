"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen, ClipboardCheck, Clock, CheckCircle,
  FolderOpen, Users, TrendingUp, AlertCircle,
  FileText, MessageSquare, ArrowRight, Loader2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { apiGet } from "@/lib/api";
import type { DashboardMetricas, ActividadReciente } from "@/lib/types";

const QUICK_ACTIONS = [
  { label: "Nueva Planeación", href: "/planeacion/nueva", icon: BookOpen, color: "text-emerald-500" },
  { label: "Evaluar Actividad", href: "/evaluacion/nueva", icon: ClipboardCheck, color: "text-sky-500" },
  { label: "Cargar Documento", href: "/documentos/cargar", icon: FolderOpen, color: "text-amber-500" },
  { label: "Consultar DBA", href: "/consulta", icon: MessageSquare, color: "text-violet-500" },
];

const ACTIVITY_ICONS: Record<string, typeof BookOpen> = {
  planeacion: BookOpen, evaluacion: ClipboardCheck,
  documento: FileText, consulta: MessageSquare,
};
const ACTIVITY_COLORS: Record<string, string> = {
  planeacion: "text-emerald-500 bg-emerald-500/10",
  evaluacion: "text-sky-500 bg-sky-500/10",
  documento: "text-amber-500 bg-amber-500/10",
  consulta: "text-violet-500 bg-violet-500/10",
};

function formatTimeAgo(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `hace ${days}d`;
  if (hours > 0) return `hace ${hours}h`;
  return "hace un momento";
}

const DEFAULT_METRICAS: DashboardMetricas = {
  planeaciones_mes: 0, evaluaciones_procesadas: 0,
  tiempo_ahorrado_horas: 0, tasa_alineacion_men: 0,
  documentos_cargados: 0, estudiantes_total: 0,
};

export default function DashboardPage() {
  const [docente, setDocente] = useState<{ nombre: string } | null>(null);
  const [metricas, setMetricas] = useState<DashboardMetricas>(DEFAULT_METRICAS);
  const [actividad, setActividad] = useState<ActividadReciente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const token = session.access_token;

      // Fetch user name
      const { data: docenteData } = await supabase
        .from("docentes").select("nombre").eq("id", session.user.id).single();
      setDocente({ nombre: docenteData?.nombre || session.user.email?.split("@")[0] || "Docente" });

      // Fetch real metrics and activity
      try {
        const [m, a] = await Promise.all([
          apiGet<DashboardMetricas>("/dashboard/metricas", token),
          apiGet<ActividadReciente[]>("/dashboard/actividad", token),
        ]);
        setMetricas(m);
        setActividad(a);
      } catch {
        // keep defaults on error
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const METRIC_CARDS = [
    { label: "Planeaciones", value: metricas.planeaciones_mes, icon: BookOpen, gradient: "from-emerald-500 to-emerald-600", change: "Total generadas", href: "/planeacion" },
    { label: "Evaluaciones procesadas", value: metricas.evaluaciones_procesadas, icon: ClipboardCheck, gradient: "from-sky-500 to-sky-600", change: "Por Gemini Vision", href: "/evaluacion" },
    { label: "Horas ahorradas", value: `${metricas.tiempo_ahorrado_horas}h`, icon: Clock, gradient: "from-amber-500 to-orange-500", change: "Estimado", href: "/dashboard" },
    { label: "Alineación MEN", value: `${metricas.tasa_alineacion_men}%`, icon: CheckCircle, gradient: "from-violet-500 to-purple-600", change: "Meta: ≥80%", href: "/dashboard" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Welcome */}
      <div className="animate-slide-up">
        <h2 className="text-2xl font-bold">
          Bienvenido/a, {loading ? "..." : (docente?.nombre || "Docente")} 👋
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Aquí tienes un resumen de tu actividad pedagógica con EduAgent.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {METRIC_CARDS.map((metric, i) => (
          <Link key={metric.label} href={metric.href}>
            <Card className="glass-card border-white/5 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 cursor-pointer group animate-slide-up"
              style={{ animationDelay: `${i * 100}ms` }}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${metric.gradient} shadow-lg`}>
                    <metric.icon className="w-4 h-4 text-white" />
                  </div>
                  <TrendingUp className="w-4 h-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                ) : (
                  <p className="text-2xl font-bold tracking-tight">{metric.value}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{metric.label}</p>
                <p className="text-[10px] text-emerald-500 mt-1 font-medium">{metric.change}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Quick Actions */}
        <Card className="glass-card border-white/5 lg:col-span-1 animate-slide-up delay-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Acciones rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href}>
                <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all group cursor-pointer">
                  <div className={`p-2 rounded-lg bg-white/5 ${action.color}`}>
                    <action.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-medium flex-1">{action.label}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glass-card border-white/5 lg:col-span-2 animate-slide-up delay-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : actividad.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sin actividad reciente. ¡Empieza creando una planeación!
              </p>
            ) : (
              <div className="space-y-3">
                {actividad.map((act) => {
                  const Icon = ACTIVITY_ICONS[act.tipo] || AlertCircle;
                  const colorClass = ACTIVITY_COLORS[act.tipo] || "text-muted-foreground bg-muted";
                  return (
                    <div key={act.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                      <div className={`p-2 rounded-lg shrink-0 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-snug">{act.descripcion}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{formatTimeAgo(act.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
        <Card className="glass-card border-white/5 animate-slide-up delay-400">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10">
              <FolderOpen className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{loading ? "—" : metricas.documentos_cargados}</p>
              <p className="text-xs text-muted-foreground">Documentos cargados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5 animate-slide-up delay-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10">
              <Users className="w-5 h-5 text-sky-500" />
            </div>
            <div>
              <p className="text-xl font-bold">{loading ? "—" : metricas.estudiantes_total}</p>
              <p className="text-xs text-muted-foreground">Mis estudiantes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5 col-span-2 lg:col-span-1 animate-slide-up delay-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Tasa de alineación MEN</span>
              <Badge variant="secondary" className="text-emerald-500 bg-emerald-500/10 text-xs">Meta: ≥80%</Badge>
            </div>
            <div className="w-full bg-white/5 rounded-full h-3 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000"
                style={{ width: `${metricas.tasa_alineacion_men}%` }} />
            </div>
            <p className="text-right text-sm font-bold mt-1 text-emerald-500">
              {loading ? "—" : `${metricas.tasa_alineacion_men}%`}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
