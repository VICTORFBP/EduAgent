"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ClipboardCheck,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Filter,
} from "lucide-react";
import { MOCK_EVALUACIONES } from "@/lib/mock-data";
import { AREA_COLORS } from "@/lib/types";
import Link from "next/link";
import { useState } from "react";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

function getNotaColor(nota: number | null): string {
  if (nota === null) return "text-muted-foreground";
  if (nota >= 4.0) return "text-emerald-500";
  if (nota >= 3.0) return "text-amber-500";
  return "text-red-500";
}

export default function EvaluacionPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = MOCK_EVALUACIONES.filter(
    (e) =>
      (e.estudiante_nombre || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h2 className="text-xl font-bold">Evaluaciones</h2>
          <p className="text-sm text-muted-foreground">
            {MOCK_EVALUACIONES.length} evaluaciones procesadas
          </p>
        </div>
        <Link href="/evaluacion/nueva">
          <Button className="gradient-primary text-white hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4 mr-2" />
            Nueva Evaluación
          </Button>
        </Link>
      </div>

      <div className="flex gap-2 animate-slide-up delay-100">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por estudiante o área..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white/5 border-white/10"
          />
        </div>
        <Button variant="outline" size="icon" className="border-white/10">
          <Filter className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-3">
        {filtered.map((ev, i) => (
          <Card
            key={ev.id}
            className="glass-card border-white/5 hover:border-white/10 transition-all animate-slide-up"
            style={{ animationDelay: `${(i + 1) * 80}ms` }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${ev.procesado_correctamente ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    {ev.procesado_correctamente ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{ev.estudiante_nombre}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge className={`${AREA_COLORS[ev.area] || "bg-muted"} border-0 text-[10px]`}>
                        {ev.area}
                      </Badge>
                      <Badge variant="outline" className="border-white/10 text-[10px]">
                        {ev.tipo}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(ev.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  {ev.nota !== null ? (
                    <p className={`text-2xl font-bold ${getNotaColor(ev.nota)}`}>
                      {ev.nota.toFixed(1)}
                    </p>
                  ) : (
                    <p className="text-sm text-red-400">Error</p>
                  )}
                </div>
              </div>
              {ev.retroalimentacion && (
                <p className="text-xs text-muted-foreground mt-3 pl-11 line-clamp-2">
                  {ev.retroalimentacion}
                </p>
              )}
              {ev.error_ocr && (
                <p className="text-xs text-red-400 mt-3 pl-11">
                  ⚠️ {ev.error_ocr}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 space-y-3 animate-fade-in">
          <ClipboardCheck className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">No se encontraron evaluaciones</p>
        </div>
      )}
    </div>
  );
}
