"use client";

import { use, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  GraduationCap,
  TrendingUp,
  ClipboardCheck,
  Star,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { AREA_COLORS } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

function getNotaColor(nota: number): string {
  if (nota >= 4.0) return "text-emerald-500";
  if (nota >= 3.0) return "text-amber-500";
  return "text-red-500";
}

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
      
      // Fetch student
      const { data: estData } = await supabase.from("estudiantes").select("*").eq("id", id).single();
      if (estData) {
        setStudent(estData);
      }
      
      // Fetch evaluations for this student
      const { data: evalData } = await supabase.from("evaluaciones").select("*").eq("estudiante_id", id).order("created_at", { ascending: false });
      if (evalData) {
        setEvaluaciones(evalData);
      }
      
      setLoading(false);
    }
    
    fetchData();
  }, [id]);

  if (loading) return <div className="p-6 text-center text-muted-foreground">Cargando perfil...</div>;
  if (!student) return <div className="p-6 text-center text-muted-foreground">Estudiante no encontrado</div>;

  const initials = student.nombre.split(" ").map((n: string) => n[0]).slice(0, 2).join("");
  
  // Calculate dynamic stats
  const evaluaciones_count = evaluaciones.length;
  const promedio_notas = evaluaciones_count > 0 
    ? evaluaciones.reduce((acc, curr) => acc + (curr.nota || 0), 0) / evaluaciones_count 
    : 0;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
      <Link href="/estudiantes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in">
        <ArrowLeft className="w-4 h-4" />
        Volver a estudiantes
      </Link>

      {/* Profile header */}
      <div className="flex items-center gap-4 animate-slide-up">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-sky-500/20 flex items-center justify-center">
          <span className="text-xl font-bold text-primary">{initials}</span>
        </div>
        <div>
          <h2 className="text-xl font-bold">{student.nombre}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="border-0">
              <GraduationCap className="w-3 h-3 mr-1" />
              Grado {student.grado}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Registrado {new Date(student.created_at).toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 animate-slide-up delay-100">
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 text-center">
            <ClipboardCheck className="w-5 h-5 text-sky-500 mx-auto mb-1" />
            <p className="text-xl font-bold">{evaluaciones_count}</p>
            <p className="text-[10px] text-muted-foreground">Evaluaciones</p>
          </CardContent>
        </Card>
        <Card className="glass-card border-white/5">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
            <p className={`text-xl font-bold ${getNotaColor(promedio_notas || 0)}`}>
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
                  className={`w-3 h-3 ${s <= Math.round(promedio_notas || 0) ? "text-amber-500 fill-amber-500" : "text-white/10"}`}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Desempeño</p>
          </CardContent>
        </Card>
      </div>

      {/* Evaluaciones */}
      <Card className="glass-card border-white/5 animate-slide-up delay-200">
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
                  <Badge className={`${(AREA_COLORS as Record<string, string>)[ev.area] || "bg-muted"} border-0 text-[10px] shrink-0`}>
                    {ev.area}
                  </Badge>
                  <div className="min-w-0">
                    <Badge variant="outline" className="text-[10px] border-white/10">{ev.tipo || 'Evaluación'}</Badge>
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(ev.created_at).toLocaleDateString("es-CO")}
                    </div>
                  </div>
                </div>
                <span className={`text-lg font-bold shrink-0 ${ev.nota !== null ? getNotaColor(ev.nota) : "text-red-400"}`}>
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
