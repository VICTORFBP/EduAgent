"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FileText,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Shield,
  BookOpen
} from "lucide-react";
import Link from "next/link";
import { AREAS } from "@/lib/types";
import { useDocumentos } from "@/hooks/useDocumentos";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useEffect } from "react";
import { optimizeFile } from "@/lib/compression";

export default function CargarDocumentoPage() {
  const [nombre, setNombre] = useState("");
  const [area, setArea] = useState("");
  const [grado, setGrado] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [rol, setRol] = useState<string>("docente");
  
  const { uploadDocumento, isLoading, error } = useDocumentos();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  useEffect(() => {
    async function checkRole() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("docentes").select("rol").eq("id", user.id).single();
        if (data && data.rol) setRol(data.rol);
      }
    }
    checkRole();
  }, []);

  const handleUpload = async () => {
    if (files.length === 0 || !nombre) return;

    try {
      setIsOptimizing(true);
      let currentProgress = 0;
      const progressPerFile = 100 / files.length;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Optimizar el archivo (comprime JPG/PNG, deja intacto PDF)
        const optimizedFile = await optimizeFile(file);
        
        const formData = new FormData();
        // Append index to name if multiple files to keep them distinct
        const finalName = files.length > 1 ? `${nombre} - Parte ${i + 1}` : nombre;
        formData.append("nombre", finalName);
        formData.append("archivo", optimizedFile);
        if (area) formData.append("area", area);
        if (grado) formData.append("grado", grado);

        await uploadDocumento(formData);
        
        currentProgress += progressPerFile;
        setProgress(Math.min(99, Math.round(currentProgress)));
      }
      
      setProgress(100);
      setIsOptimizing(false);
      setIsDone(true);
      toast.success(files.length > 1 ? `${files.length} documentos cargados` : "Documento cargado correctamente");
    } catch (err) {
      toast.error("Error al cargar los documentos");
      setProgress(0);
      setIsOptimizing(false);
    }
  };

  const isAdmin = rol === "admin";

  const removeFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-2xl mx-auto">
      <Link href="/documentos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in">
        <ArrowLeft className="w-4 h-4" />
        Volver a documentos
      </Link>

      <Card className="glass-card border-white/5 animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isAdmin ? <Shield className="w-5 h-5 text-emerald-500" /> : <BookOpen className="w-5 h-5 text-primary" />}
            {isAdmin ? "Cargar Lineamiento Oficial (MEN)" : "Cargar Material de Apoyo"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {isAdmin 
              ? "Sube documentos oficiales del Ministerio (ej. DBAs, Estándares). Estarán disponibles para todos."
              : "Sube PDFs o imágenes de tus materiales de clase. La IA los analizará directamente como referencia al generar planeaciones, sin necesidad de vectorización."}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Nombre base (se numerarán si son varios)</Label>
            <Input
              placeholder="Ej: Guía Escuela Nueva - Matemáticas"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="bg-white/5 border-white/10"
              disabled={isLoading || isDone}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Área (opcional)</Label>
              <Select value={area} onValueChange={(v) => v && setArea(v)} disabled={isLoading || isDone}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Todas las áreas" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grado (opcional)</Label>
              <Select value={grado} onValueChange={(v) => v && setGrado(v)} disabled={isLoading || isDone}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Todos los grados" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((g) => (
                    <SelectItem key={g} value={g.toString()}>Grado {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label>Archivos PDF / Imágenes</Label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf, .jpg, .jpeg, .png"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              className="hidden"
            />
            <div
              onClick={() => !isLoading && !isOptimizing && !isDone && fileRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                files.length > 0 
                  ? "border-primary/50 bg-primary/5" 
                  : "border-white/10 hover:border-primary/30 hover:bg-primary/5"
              } ${(isLoading || isOptimizing) || isDone ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
            >
              {files.length > 0 ? (
                <div className="flex flex-col items-center gap-3">
                  <FileText className="w-10 h-10 text-primary" />
                  <p className="text-sm font-medium">{files.length} archivo(s) seleccionado(s)</p>
                  <div className="w-full max-w-sm space-y-2 text-left">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs bg-black/20 p-2 rounded-lg border border-white/5">
                        <span className="truncate pr-2">{file.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          {!isLoading && !isDone && (
                            <button onClick={(e) => removeFile(idx, e)} className="text-red-400 hover:text-red-300">
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">Arrastra o haz clic para subir</p>
                  <p className="text-xs text-muted-foreground/60">Selecciona uno o varios PDFs • Máx 20MB/archivo</p>
                </div>
              )}
            </div>
          </div>

          {(isLoading || isOptimizing) && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{isOptimizing && !isLoading ? "Optimizando..." : `Subiendo ${files.length > 1 ? "documentos" : "documento"}...`}</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-sky-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-lg animate-fade-in">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {isDone ? (
            <div className="text-center p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 animate-fade-in">
              <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-medium text-sm">Carga exitosa</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isAdmin
                  ? "El procesamiento y vectorización han comenzado."
                  : "Tu documento está listo como referencia directa para la IA. Seléccionalo al crear tu próxima planeación."}
              </p>
              <div className="flex gap-2 mt-4 justify-center">
                <Button variant="outline" size="sm" className="border-white/10" onClick={() => {
                  setFiles([]);
                  setNombre("");
                  setIsDone(false);
                  setProgress(0);
                }}>
                  Subir más
                </Button>
                <Link href="/documentos">
                  <Button size="sm" className="gradient-primary text-white">
                    Ir a mis documentos
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleUpload}
              disabled={files.length === 0 || !nombre || (isLoading || isOptimizing)}
              className="w-full h-12 gradient-primary text-white font-medium shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
            >
              {(isLoading || isOptimizing) ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Upload className="w-5 h-5 mr-2" />
              )}
              {(isLoading || isOptimizing) ? "Procesando..." : "Cargar Documento(s)"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
