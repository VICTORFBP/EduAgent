"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Filter,
  Calculator,
  Leaf,
  Globe,
  Heart,
  Palette,
  Loader2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { AREA_COLORS } from "@/lib/types";
import { usePlaneaciones } from "@/hooks/usePlaneaciones";
import Link from "next/link";
import { useState, useEffect } from "react";

const AREA_ICON_MAP: Record<string, typeof Calculator> = {
  "Matemáticas": Calculator,
  "Lenguaje": BookOpen,
  "Ciencias Naturales": Leaf,
  "Ciencias Sociales": Globe,
  "Ética": Heart,
  "Artística": Palette,
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function PlaneacionPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const { planeaciones, isLoading, fetchPlaneaciones, deletePlaneacion } = usePlaneaciones();

  const handleDelete = async (e: React.MouseEvent, planId: string, tema: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`¿Eliminar la planeación "${tema}"? Esta acción no se puede deshacer.`)) return;
    try {
      await deletePlaneacion(planId);
      toast.success("Planeación eliminada");
    } catch {
      toast.error("Error al eliminar la planeación");
    }
  };

  useEffect(() => {
    fetchPlaneaciones();
  }, [fetchPlaneaciones]);

  const filteredPlaneaciones = planeaciones.filter(
    (p) =>
      p.tema.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h2 className="text-xl font-bold">Mis Planeaciones</h2>
          <p className="text-sm text-muted-foreground">
            {planeaciones.length} planeaciones generadas
          </p>
        </div>
        <Link href="/planeacion/nueva">
          <Button className="gradient-primary text-white hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Planeación
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="flex gap-2 animate-slide-up delay-100">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por tema o área..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 h-10 rounded-md border border-white/10 bg-white/5 px-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>
        <Button variant="outline" size="icon" className="border-white/10">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      {isLoading && planeaciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando planeaciones...</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredPlaneaciones.map((plan, i) => {
            const AreaIcon = AREA_ICON_MAP[plan.area] || BookOpen;
            return (
              <Link key={plan.id} href={`/planeacion/${plan.id}`}>
                <Card
                  className="glass-card border-white/5 hover:border-white/15 transition-all duration-300 hover:-translate-y-1 cursor-pointer h-full animate-slide-up relative"
                  style={{ animationDelay: `${(i + 1) * 100}ms` }}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge className={`${AREA_COLORS[plan.area] || "bg-muted"} border-0 text-xs`}>
                        <AreaIcon className="w-3 h-3 mr-1" />
                        {plan.area}
                      </Badge>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, plan.id, plan.tema)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          aria-label="Eliminar planeación"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {plan.validada_docente ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Clock className="w-4 h-4 text-amber-500" />
                        )}
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm leading-snug line-clamp-2">
                      {plan.tema}
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {plan.grados.map((g: number, idx: number) => (
                        <span
                          key={`${plan.id}-grado-${g}-${idx}`}
                          className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground"
                        >
                          Grado {g}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-white/5">
                      <span>{formatDate(plan.created_at)}</span>
                      <span>{plan.agente_usado}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {!isLoading && filteredPlaneaciones.length === 0 && (
        <div className="text-center py-12 space-y-3 animate-fade-in">
          <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">No se encontraron planeaciones</p>
          <Link href="/planeacion/nueva">
            <Button variant="outline" className="border-white/10">
              Crear primera planeación
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
