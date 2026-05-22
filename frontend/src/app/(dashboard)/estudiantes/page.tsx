"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  GraduationCap,
  TrendingUp,
  ClipboardCheck,
} from "lucide-react";
import { MOCK_ESTUDIANTES } from "@/lib/mock-data";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

function getNotaColor(nota: number): string {
  if (nota >= 4.0) return "text-emerald-500";
  if (nota >= 3.0) return "text-amber-500";
  return "text-red-500";
}

export default function EstudiantesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrado, setSelectedGrado] = useState<number | null>(null);
  const [estudiantes, setEstudiantes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get teacher profile to know which grades they have assigned
      const { data: docente } = await supabase.from("docentes").select("grados_asignados, rol").eq("id", user.id).single();
      
      let query = supabase.from("estudiantes").select("*").order("grado");
      
      // If not admin, only fetch assigned students
      if (docente && docente.rol !== "admin") {
        query = query.eq("docente_id", user.id);
      }

      const { data: estData } = await query;
      if (estData) {
        setEstudiantes(estData);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  const filtered = estudiantes.filter((s) => {
    const matchSearch = s.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGrado = selectedGrado === null || s.grado === selectedGrado;
    return matchSearch && matchGrado;
  });

  const gradoCounts = [1, 2, 3, 4, 5].map((g) => ({
    grado: g,
    count: estudiantes.filter((s) => s.grado === g).length,
  })).filter(g => g.count > 0);

  if (loading) return <div className="p-6 text-center text-muted-foreground">Cargando estudiantes...</div>;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="animate-slide-up">
        <h2 className="text-xl font-bold">Mis Estudiantes</h2>
        <p className="text-sm text-muted-foreground">
          {estudiantes.length} estudiantes en tus grados asignados
        </p>
      </div>

      {/* Grade filters */}
      <div className="flex gap-2 flex-wrap animate-slide-up delay-100">
        <button
          onClick={() => setSelectedGrado(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
            selectedGrado === null
              ? "bg-primary/15 border-primary/30 text-primary"
              : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
          }`}
        >
          Todos ({estudiantes.length})
        </button>
        {gradoCounts.map(({ grado, count }) => (
          <button
            key={grado}
            onClick={() => setSelectedGrado(grado === selectedGrado ? null : grado)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
              selectedGrado === grado
                ? "bg-primary/15 border-primary/30 text-primary"
                : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
            }`}
          >
            Grado {grado} ({count})
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative animate-slide-up delay-100">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar estudiante..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-white/5 border-white/10"
        />
      </div>

      {/* Student cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((student, i) => (
          <Link key={student.id} href={`/estudiantes/${student.id}`}>
            <Card
              className="glass-card border-white/5 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 cursor-pointer animate-slide-up"
              style={{ animationDelay: `${(i + 2) * 60}ms` }}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-sky-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {student.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-sm">{student.nombre}</p>
                      <Badge variant="secondary" className="text-[10px] border-0 mt-0.5">
                        <GraduationCap className="w-2.5 h-2.5 mr-0.5" />
                        Grado {student.grado}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs pt-2 border-t border-white/5">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <ClipboardCheck className="w-3 h-3" />
                    {student.evaluaciones_count} evaluaciones
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span className={`font-bold ${getNotaColor(student.promedio_notas || 0)}`}>
                      {student.promedio_notas?.toFixed(1)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 space-y-3 animate-fade-in">
          <Users className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">No se encontraron estudiantes</p>
        </div>
      )}
    </div>
  );
}
