"use client";

import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FolderOpen,
  Plus,
  FileText,
  CheckCircle,
  Clock,
  Database,
  Upload,
  Trash2,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useDocumentos } from "@/hooks/useDocumentos";
import Link from "next/link";
import { toast } from "sonner";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DocumentosPage() {
  const { documentos, isLoading, fetchDocumentos, deleteDocumento, reprocesarDocumento } = useDocumentos();

  useEffect(() => {
    fetchDocumentos();
  }, [fetchDocumentos]);

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este documento?")) return;
    try {
      await deleteDocumento(id);
      toast.success("Documento eliminado correctamente");
    } catch (error) {
      toast.error("Error al eliminar el documento");
    }
  };

  const handleReprocesar = async (id: string) => {
    try {
      await reprocesarDocumento(id);
      toast.success("Reprocesamiento iniciado");
    } catch (error) {
      toast.error("Error al iniciar reprocesamiento");
    }
  };

  const oficiales = documentos.filter((d) => d.tipo === "MEN_OFICIAL");
  const propios = documentos.filter((d) => d.tipo === "DOCENTE_CUSTOM");

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-slide-up">
        <div>
          <h2 className="text-xl font-bold">Documentos</h2>
          <p className="text-sm text-muted-foreground">
            {documentos.length} documentos en el sistema
          </p>
        </div>
        <Link href="/documentos/cargar">
          <Button className="gradient-primary text-white hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4 mr-2" />
            Cargar Documento
          </Button>
        </Link>
      </div>

      {isLoading && documentos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Cargando documentos...</p>
        </div>
      ) : (
        <>
          {/* MEN Official */}
          {oficiales.length > 0 && (
            <div className="space-y-3 animate-slide-up delay-100">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" />
                Documentos Oficiales MEN
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {oficiales.map((doc) => (
                  <Card key={doc.id} className="glass-card border-white/5 hover:border-white/10 transition-all relative group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-emerald-500/10 shrink-0">
                          <FileText className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{doc.nombre}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {doc.area && (
                              <Badge variant="secondary" className="text-[10px] border-0">
                                {doc.area}
                              </Badge>
                            )}
                            {doc.vectorizado ? (
                              <Badge className="bg-emerald-500/15 text-emerald-500 border-0 text-[10px]">
                                <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                                Vectorizado
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/15 text-amber-500 border-0 text-[10px]">
                                <Clock className="w-2.5 h-2.5 mr-0.5" />
                                Pendiente
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5">{formatDate(doc.created_at)}</p>
                        </div>
                        <div className="flex flex-col gap-1 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!doc.vectorizado && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReprocesar(doc.id)}
                              className="text-primary hover:bg-primary/10"
                              title="Reprocesar vectorización"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(doc.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Eliminar documento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Custom */}
          <div className="space-y-3 animate-slide-up delay-200">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Upload className="w-4 h-4 text-sky-500" />
              Mis Documentos
            </h3>
            {propios.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {propios.map((doc) => (
                  <Card key={doc.id} className="glass-card border-white/5 hover:border-white/10 transition-all relative group">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-sky-500/10 shrink-0">
                          <FileText className="w-5 h-5 text-sky-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{doc.nombre}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {doc.area && (
                              <Badge variant="secondary" className="text-[10px] border-0">{doc.area}</Badge>
                            )}
                            {doc.grado && (
                              <Badge variant="outline" className="text-[10px] border-white/10">G{doc.grado}</Badge>
                            )}
                            {doc.vectorizado ? (
                              <Badge className="bg-emerald-500/15 text-emerald-500 border-0 text-[10px]">
                                <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                                Vectorizado
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/15 text-amber-500 border-0 text-[10px]">
                                <Clock className="w-2.5 h-2.5 mr-0.5" />
                                Pendiente
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1.5">{formatDate(doc.created_at)}</p>
                        </div>
                        <div className="flex flex-col gap-1 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!doc.vectorizado && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleReprocesar(doc.id)}
                              className="text-primary hover:bg-primary/10"
                              title="Reprocesar vectorización"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(doc.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Eliminar documento"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-2xl">
                <p className="text-sm text-muted-foreground">No has cargado documentos propios</p>
              </div>
            )}
          </div>
        </>
      )}

      {!isLoading && documentos.length === 0 && (
        <div className="text-center py-12 space-y-3 animate-fade-in">
          <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">No hay documentos en el sistema</p>
        </div>
      )}
    </div>
  );
}
