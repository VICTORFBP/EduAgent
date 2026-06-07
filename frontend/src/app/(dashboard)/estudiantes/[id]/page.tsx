"use client";

import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  GraduationCap,
  TrendingUp,
  TrendingDown,
  Minus,
  ClipboardCheck,
  Star,
  Calendar,
  BarChart2,
} from "lucide-react";
import Link from "next/link";
import { AREA_COLORS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getNotaColor(nota: number): string {
  if (nota >= 8.0) return "text-emerald-500";
  if (nota >= 6.0) return "text-amber-500";
  return "text-red-400";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function msToMin(ms: number): string {
  const min = Math.round(ms / 60000);
  return min > 0 ? `${min} min` : "<1 min";
}

// ─── SVG Progress Chart ──────────────────────────────────────────────────────

interface ProgressChartProps {
  evaluaciones: { nota: number | null; created_at: string; area: string }[];
}

function ProgressChart({ evaluaciones }: ProgressChartProps) {
  const withNotas = evaluaciones
    .filter((e) => e.nota !== null)
    .slice()
    .reverse(); // oldest first

  if (withNotas.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        Se necesitan al menos 2 evaluaciones con nota para mostrar la gráfica.
      </div>
    );
  }

  const W = 320;
  const H = 120;
  const PADDING = { top: 16, right: 16, bottom: 28, left: 32 };
  const chartW = W - PADDING.left - PADDING.right;
  const chartH = H - PADDING.top - PADDING.bottom;

  const minNota = 0;
  const maxNota = 10;

  const toX = (i: number) =>
    PADDING.left + (i / (withNotas.length - 1)) * chartW;
  const toY = (nota: number) =>
    PADDING.top + chartH - ((nota - minNota) / (maxNota - minNota)) * chartH;

  const points = withNotas
    .map((e, i) => `${toX(i)},${toY(e.nota!)}`)
    .join(" ");

  // Gradient fill path
  const fillPath = `M${toX(0)},${toY(withNotas[0].nota!)} ${withNotas
    .slice(1)
    .map((e, i) => `L${toX(i + 1)},${toY(e.nota!)}`)
    .join(" ")} L${toX(withNotas.length - 1)},${PADDING.top + chartH} L${toX(0)},${PADDING.top + chartH} Z`;

  // Y-axis ticks
  const yTicks = [0, 2, 4, 6, 8, 10];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ maxHeight: 140 }}
      aria-label="Gráfica de progreso del estudiante"
    >
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yTicks.map((t) => (
        <line
          key={t}
          x1={PADDING.left}
          x2={W - PADDING.right}
          y1={toY(t)}
          y2={toY(t)}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}

      {/* Y axis labels */}
      {yTicks.map((t) => (
        <text
          key={t}
          x={PADDING.left - 6}
          y={toY(t) + 4}
          textAnchor="end"
          fontSize="9"
          fill="rgba(255,255,255,0.35)"
        >
          {t}
        </text>
      ))}

      {/* X axis date labels */}
      {withNotas.map((e, i) => {
        // Only show first, middle and last to avoid overlap
        const showLabel = i === 0 || i === withNotas.length - 1 || (withNotas.length > 4 && i === Math.floor(withNotas.length / 2));
        return showLabel ? (
          <text
            key={i}
            x={toX(i)}
            y={H - 4}
            textAnchor="middle"
            fontSize="8"
            fill="rgba(255,255,255,0.35)"
          >
            {formatDate(e.created_at)}
          </text>
        ) : null;
      })}

      {/* Fill area */}
      <path d={fillPath} fill="url(#chartGrad)" />

      {/* Line */}
      <polyline
        points={points}
        fill="none"
        stroke="#10b981"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Data points */}
      {withNotas.map((e, i) => (
        <circle
          key={i}
          cx={toX(i)}
          cy={toY(e.nota!)}
          r="3.5"
          fill="#0f172a"
          stroke="#10b981"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

// ─── Trend Badge ─────────────────────────────────────────────────────────────

function TrendBadge({ evaluaciones }: { evaluaciones: { nota: number | null }[] }) {
  const withNotas = evaluaciones.filter((e) => e.nota !== null).slice().reverse();
  if (withNotas.length < 4) return null;

  const half = Math.floor(withNotas.length / 2);
  const recent = withNotas.slice(-half).map((e) => e.nota!);
  const older = withNotas.slice(0, half).map((e) => e.nota!);
  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgOlder = older.reduce((a, b) => a + b, 0) / older.length;
  const diff = avgRecent - avgOlder;

  if (diff > 0.3)
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-0 text-xs gap-1">
        <TrendingUp className="w-3 h-3" /> Mejorando
      </Badge>
    );
  if (diff < -0.3)
    return (
      <Badge className="bg-red-500/15 text-red-400 border-0 text-xs gap-1">
        <TrendingDown className="w-3 h-3" /> Bajando
      </Badge>
    );
  return (
    <Badge className="bg-amber-500/15 text-amber-400 border-0 text-xs gap-1">
      <Minus className="w-3 h-3" /> Estable
    </Badge>
  );
}

// ─── Area Breakdown ───────────────────────────────────────────────────────────

function AreaBreakdown({ evaluaciones }: { evaluaciones: { nota: number | null; area: string }[] }) {
  const map: Record<string, number[]> = {};
  for (const e of evaluaciones) {
    if (e.nota === null) continue;
    if (!map[e.area]) map[e.area] = [];
    map[e.area].push(e.nota);
  }
  const areas = Object.entries(map).map(([area, notas]) => ({
    area,
    promedio: notas.reduce((a, b) => a + b, 0) / notas.length,
    count: notas.length,
  }));

  if (areas.length === 0) return null;

  return (
    <Card className="glass-card border-white/5 animate-slide-up delay-300">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-violet-400" />
          Promedio por Área
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {areas
          .sort((a, b) => b.promedio - a.promedio)
          .map(({ area, promedio, count }) => (
            <div key={area} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5">
                  <Badge
                    className={`${(AREA_COLORS as Record<string, string>)[area] || "bg-muted"} border-0 text-[10px] py-0`}
                  >
                    {area}
                  </Badge>
                  <span className="text-muted-foreground">({count} eval.)</span>
                </span>
                <span className={`font-bold ${getNotaColor(promedio)}`}>
                  {promedio.toFixed(1)}
                </span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                  style={{ width: `${(promedio / 10) * 100}%` }}
                />
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function EstudianteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [student, setStudent] = useState<any>(null);
  const [evaluaciones, setEvaluaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();

      const { data: estData } = await supabase
        .from("estudiantes")
        .select("*")
        .eq("id", id)
        .single();
      if (estData) setStudent(estData);

      const { data: evalData } = await supabase
        .from("evaluaciones")
        .select("*")
        .eq("estudiante_id", id)
        .order("created_at", { ascending: false });
      if (evalData) setEvaluaciones(evalData);

      setLoading(false);
    }
    fetchData();
  }, [id]);

  if (loading)
    return <div className="p-6 text-center text-muted-foreground">Cargando perfil...</div>;
  if (!student)
    return <div className="p-6 text-center text-muted-foreground">Estudiante no encontrado</div>;

  const initials = student.nombre
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("");

  const withNotas = evaluaciones.filter((e) => e.nota !== null);
  const promedio_notas =
    withNotas.length > 0
      ? withNotas.reduce((acc, curr) => acc + (curr.nota || 0), 0) / withNotas.length
      : 0;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-3xl mx-auto">
      <Link
        href="/estudiantes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a estudiantes
      </Link>

      {/* Profile header */}
      <div className="flex items-center gap-4 animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-sky-500/20 flex items-center justify-center shrink-0">
          <span className="text-xl font-bold text-primary">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold">{student.nombre}</h2>
            <TrendBadge evaluaciones={evaluaciones} />
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="secondary" className="border-0">
              <GraduationCap className="w-3 h-3 mr-1" />
              Grado {student.grado}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Registrado{" "}
              {new Date(student.created_at).toLocaleDateString("es-CO", {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 animate-slide-up delay-100">
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 text-center">
            <ClipboardCheck className="w-5 h-5 text-sky-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{evaluaciones.length}</p>
            <p className="text-[10px] text-muted-foreground">Evaluaciones</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className={`text-xl font-bold ${getNotaColor(promedio_notas)}`}>
              {promedio_notas > 0 ? promedio_notas.toFixed(1) : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground">Promedio</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 text-center">
            <Star className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <div className="flex justify-center gap-0.5 mt-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3 h-3 ${
                    s <= Math.round(promedio_notas)
                      ? "text-amber-500 fill-amber-500"
                      : "text-white/10"
                  }`}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Desempeño</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Chart */}
      <Card className="glass-card border-white/5 animate-slide-up delay-200">
        <CardHeader className="pb-1">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Progreso en el tiempo
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 pb-3 px-3">
          <ProgressChart evaluaciones={evaluaciones} />
        </CardContent>
      </Card>

      {/* Area breakdown */}
      <AreaBreakdown evaluaciones={evaluaciones} />

      {/* Evaluation history */}
      <Card className="glass-card border-white/5 animate-slide-up delay-400">
        <CardHeader>
          <CardTitle className="text-base">Historial de Evaluaciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {evaluaciones.length > 0 ? (
            evaluaciones.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Badge
                    className={`${
                      (AREA_COLORS as Record<string, string>)[ev.area] || "bg-muted"
                    } border-0 text-[10px] shrink-0`}
                  >
                    {ev.area}
                  </Badge>
                  <div className="min-w-0">
                    <Badge variant="outline" className="text-[10px] border-white/10">
                      {ev.tipo || "Evaluación"}
                    </Badge>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(ev.created_at).toLocaleDateString("es-CO")}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-lg font-bold shrink-0 ${
                    ev.nota !== null ? getNotaColor(ev.nota) : "text-red-400"
                  }`}
                >
                  {ev.nota !== null ? Number(ev.nota).toFixed(1) : "—"}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No hay evaluaciones registradas
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
