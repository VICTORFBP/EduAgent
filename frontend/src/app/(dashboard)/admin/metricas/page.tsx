"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  ClipboardCheck,
  Clock,
  CheckCircle,
  TrendingUp,
  Users,
  AlertCircle,
  Loader2,
  BarChart2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apiGet } from "@/lib/api";
import type { PilotMetrics } from "@/lib/types";

// ─── Types ─────────────────────────────────────────────────────────────────

interface DocenteMetric {
  docente_id: string;
  nombre: string;
  total_planeaciones: number;
  planeaciones_validadas: number;
  planeaciones_corregidas: number;
  tiempo_promedio_planeacion_ms: number;
  tiempo_ahorrado_horas: number;
  total_evaluaciones: number;
  evaluaciones_ok: number;
  tasa_ocr: number;
}

interface GlobalData {
  docentes: DocenteMetric[];
  global: PilotMetrics & {
    total_planeaciones: number;
    total_evaluaciones: number;
    total_evaluaciones_ok: number;
    total_planeaciones_validadas: number;
    total_planeaciones_corregidas: number;
    tiempo_promedio_planeacion_ms: number;
    tasa_correccion_rag: number;
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function msToMin(ms: number): string {
  if (!ms) return "—";
  const min = Math.round(ms / 60000);
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}h ${m}m` : `${m} min`;
}

function StatCard({
  label,
  value,
  icon: Icon,
  gradient,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  gradient: string;
  sub?: string;
}) {
  return (
    <Card className="glass-card border-white/5">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-emerald-500 mt-1 font-medium">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function ProgressBar({ value, max = 100, color = "emerald" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r from-${color}-500 to-${color}-400 transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminMetricasPilotoPage() {
  const [data, setData] = useState<GlobalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      try {
        const result = await apiGet<GlobalData>("/admin/metricas-piloto", session.access_token);
        setData(result);
      } catch (e: any) {
        setError(e?.message || "Error cargando métricas.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 flex items-center gap-2 text-red-400">
        <AlertCircle className="w-5 h-5" />
        {error || "Sin datos disponibles."}
      </div>
    );
  }

  const g = data.global;
  const BASELINE_MIN = 150; // 2.5h baseline
  const avgMin = Math.round((g.tiempo_promedio_planeacion_ms || 0) / 60000);

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="animate-slide-up">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BarChart2 className="w-6 h-6 text-violet-400" />
          Métricas del Piloto
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Resumen agregado de todos los docentes · Baseline: 2.5h por planeación manual
        </p>
      </div>

      {/* Global stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-slide-up delay-100">
        <StatCard
          label="Planeaciones generadas"
          value={g.total_planeaciones}
          icon={BookOpen}
          gradient="from-emerald-500 to-emerald-600"
          sub={`${g.total_planeaciones_validadas} validadas`}
        />
        <StatCard
          label="Evaluaciones procesadas"
          value={`${g.total_evaluaciones_ok}/${g.total_evaluaciones}`}
          icon={ClipboardCheck}
          gradient="from-sky-500 to-sky-600"
          sub={`${g.tasa_exito_ocr ?? 0}% éxito OCR`}
        />
        <StatCard
          label="Tiempo prom. planeación IA"
          value={msToMin(g.tiempo_promedio_planeacion_ms)}
          icon={Clock}
          gradient="from-amber-500 to-orange-500"
          sub={avgMin > 0 ? `vs ${BASELINE_MIN} min manual` : "Sin datos aún"}
        />
        <StatCard
          label="Horas ahorradas (est.)"
          value={`${g.tiempo_ahorrado_horas ?? 0}h`}
          icon={TrendingUp}
          gradient="from-violet-500 to-purple-600"
          sub="Acumulado piloto"
        />
      </div>

      {/* Metric bars */}
      <div className="grid lg:grid-cols-3 gap-4 animate-slide-up delay-200">
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tasa alineación MEN</span>
              <Badge variant="secondary" className="text-emerald-500 bg-emerald-500/10 text-[10px]">
                Meta ≥80%
              </Badge>
            </div>
            <ProgressBar value={g.tasa_alineacion_men ?? 0} color="emerald" />
            <p className="text-right text-lg font-bold text-emerald-500">{g.tasa_alineacion_men ?? 0}%</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tasa corrección RAG</span>
              <Badge variant="secondary" className="text-amber-500 bg-amber-500/10 text-[10px]">
                Planeaciones corregidas
              </Badge>
            </div>
            <ProgressBar value={g.tasa_correccion_rag ?? 0} color="amber" />
            <p className="text-right text-lg font-bold text-amber-500">{g.tasa_correccion_rag ?? 0}%</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tasa éxito OCR</span>
              <Badge variant="secondary" className="text-sky-500 bg-sky-500/10 text-[10px]">
                Evaluaciones OK
              </Badge>
            </div>
            <ProgressBar value={g.tasa_exito_ocr ?? 0} color="sky" />
            <p className="text-right text-lg font-bold text-sky-500">{g.tasa_exito_ocr ?? 0}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Per-docente table */}
      {data.docentes.length > 0 && (
        <Card className="glass-card border-white/5 animate-slide-up delay-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400" />
              Desglose por Docente
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-white/5">
                  <th className="pb-2 font-medium">Docente</th>
                  <th className="pb-2 font-medium text-right">Plan.</th>
                  <th className="pb-2 font-medium text-right">Validadas</th>
                  <th className="pb-2 font-medium text-right">Corregidas</th>
                  <th className="pb-2 font-medium text-right">T. prom. IA</th>
                  <th className="pb-2 font-medium text-right">H. ahorradas</th>
                  <th className="pb-2 font-medium text-right">Eval.</th>
                  <th className="pb-2 font-medium text-right">OCR %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.docentes
                  .sort((a, b) => b.total_planeaciones - a.total_planeaciones)
                  .map((d) => (
                    <tr key={d.docente_id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2.5 pr-4 font-medium">{d.nombre || "—"}</td>
                      <td className="py-2.5 text-right">{d.total_planeaciones}</td>
                      <td className="py-2.5 text-right text-emerald-400">{d.planeaciones_validadas}</td>
                      <td className="py-2.5 text-right text-amber-400">{d.planeaciones_corregidas}</td>
                      <td className="py-2.5 text-right">{msToMin(d.tiempo_promedio_planeacion_ms)}</td>
                      <td className="py-2.5 text-right text-violet-400">{d.tiempo_ahorrado_horas}h</td>
                      <td className="py-2.5 text-right">{d.total_evaluaciones}</td>
                      <td className="py-2.5 text-right">
                        <Badge
                          className={`text-[10px] border-0 ${
                            d.tasa_ocr >= 80
                              ? "bg-emerald-500/15 text-emerald-400"
                              : d.tasa_ocr >= 50
                              ? "bg-amber-500/15 text-amber-400"
                              : "bg-red-500/15 text-red-400"
                          }`}
                        >
                          {d.tasa_ocr}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {data.docentes.length === 0 && (
        <Card className="glass-card border-white/5">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Los datos del piloto aparecerán aquí una vez que los docentes empiecen a usar el sistema.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
