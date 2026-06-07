"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Image as ImageIcon,
  FileText,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useEstudiantes } from "@/hooks/useEstudiantes";
import { useEvaluaciones } from "@/hooks/useEvaluaciones";
import { usePlaneaciones } from "@/hooks/usePlaneaciones";
import { AREAS } from "@/lib/types";

function QueryParamHandler({ setPlaneacionId, setGrado, setArea, setTipo }: any) {
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const pId = searchParams.get("planeacion_id");
    if (pId) setPlaneacionId(pId);
    
    const g = searchParams.get("grado");
    if (g) setGrado(g);
    
    const a = searchParams.get("area");
    if (a) setArea(a);
    
    const t = searchParams.get("tipo");
    if (t) setTipo(t);
  }, [searchParams, setPlaneacionId, setGrado, setArea, setTipo]);

  return null;
}

export default function NuevaEvaluacionPage() {
  const { estudiantes } = useEstudiantes();
  const { processEvaluacion } = useEvaluaciones();
  const { planeaciones } = usePlaneaciones();
  
  const [planeacionId, setPlaneacionId] = useState<string>("none");
  const [grado, setGrado] = useState<string>("");
  const [tipo, setTipo] = useState("");
  const [area, setArea] = useState("");
  const [estudianteId, setEstudianteId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    id?: string;
    status?: string;
    message?: string;
    data?: any;
    nota?: number;
    retroalimentacion?: string;
    procesado_correctamente?: boolean;
    error_ocr?: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      if (f.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(f);
      } else {
        setPreview(null);
      }
    }
  };

  const handleProcess = async () => {
    if (!canProcess) return;
    
    setIsProcessing(true);
    setResult(null);
    
    try {
      const formData = new FormData();
      formData.append("estudiante_id", estudianteId);
      
      const student = estudiantes.find((s) => s.id === estudianteId);
      if (student) {
        formData.append("estudiante_nombre", student.nombre);
      } else {
        formData.append("estudiante_nombre", "Estudiante Desconocido");
      }

      formData.append("area", area);
      formData.append("tipo", tipo);
      if (file) formData.append("archivo", file);
      
      if (planeacionId !== "none") {
        formData.append("planeacion_id", planeacionId);
        if (grado) formData.append("grado", grado);
      }
      
      const response = await processEvaluacion(formData);
      setResult(response);
    } catch (err) {
      console.error("Error processing evaluation:", err);
      // In a real app, show a toast error
    } finally {
      setIsProcessing(false);
    }
  };

  const canProcess = Boolean(tipo && area && estudianteId && file && (planeacionId === "none" || grado));

  const selectedPlan = planeaciones.find(p => p.id === planeacionId);

  const handlePlaneacionChange = (val: string) => {
    setPlaneacionId(val);
    setGrado("");
    if (val !== "none") {
      const plan = planeaciones.find((p) => p.id === val);
      if (plan) {
        setArea(plan.area);
      }
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
      <Suspense fallback={null}>
        <QueryParamHandler 
          setPlaneacionId={setPlaneacionId}
          setGrado={setGrado}
          setArea={setArea}
          setTipo={setTipo}
        />
      </Suspense>

      <Link href="/evaluacion" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors animate-fade-in">
        <ArrowLeft className="w-4 h-4" />
        Volver a evaluaciones
      </Link>

      <Card className="glass-card border-white/5 animate-slide-up">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Evaluar Actividad
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Sube la imagen o PDF de la evaluación del estudiante para obtener calificación + retroalimentación.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Vincular Planeacion */}
          <div className="space-y-4 bg-white/5 border border-white/10 p-4 rounded-xl">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-500" />
                Vincular con Planeación / Actividad Generada (Opcional)
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Permite a la IA calificar basándose en las respuestas o rúbricas de la actividad generada.
              </p>
              <Select value={planeacionId} onValueChange={handlePlaneacionChange}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Seleccionar planeación..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin vincular (Evaluación manual)</SelectItem>
                  {planeaciones.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.tema} ({p.area})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {planeacionId !== "none" && selectedPlan && (
              <div className="space-y-2 animate-fade-in">
                <Label>Grado de la Actividad</Label>
                <Select value={grado} onValueChange={setGrado}>
                  <SelectTrigger className="bg-white/5 border-white/10">
                    <SelectValue placeholder="Selecciona el grado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedPlan.grados.map((g) => (
                      <SelectItem key={g} value={g.toString()}>
                        Grado {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo de evaluación</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "estandarizada", label: "Estandarizada", desc: "Burbujas A/B/C/D", icon: CheckCircle },
                { value: "abierta", label: "Abierta", desc: "Procedimientos / textos", icon: FileText },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTipo(t.value)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    tipo === t.value
                      ? "bg-primary/10 border-primary/30"
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  }`}
                >
                  <t.icon className={`w-5 h-5 mb-2 ${tipo === t.value ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Area + Estudiante */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Área</Label>
              <Select value={area} onValueChange={(v) => v && setArea(v)}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estudiante</Label>
              <Select value={estudianteId} onValueChange={(v) => v && setEstudianteId(v)}>
                <SelectTrigger className="bg-white/5 border-white/10">
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {estudiantes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre} (G{s.grado})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* File upload */}
          <div className="space-y-2">
            <Label>Archivo de evaluación</Label>
            {tipo === "estandarizada" && (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600/90 dark:text-amber-400 p-3 rounded-lg text-sm flex items-start gap-2 mb-2 animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p>
                  Para pruebas estandarizadas, sube <strong>ÚNICAMENTE la Hoja de Respuestas</strong>. El sistema calificará automáticamente usando la clave almacenada.
                </p>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              {preview ? (
                <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-lg" />
              ) : file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-10 h-10 text-muted-foreground" />
                  <p className="text-sm">{file.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <ImageIcon className="w-10 h-10 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    Arrastra o haz clic para subir
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    JPG, PNG o PDF • Máx 10MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleProcess}
            disabled={!canProcess || isProcessing}
            className="w-full h-12 gradient-primary text-white font-medium"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Procesando con Gemini Vision...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Procesar Evaluación
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result Processing */}
      {result && result.status === "processing" && (
        <Card className="glass-card border-emerald-500/30 bg-emerald-500/5 animate-slide-up">
          <CardContent className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="font-bold text-xl text-emerald-400">¡Evaluación enviada con éxito!</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {result.message || "La evaluación se está procesando en segundo plano mediante IA. Recibirás la calificación en breves momentos."}
            </p>
            <div className="pt-4 flex justify-center gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setPreview(null);
                  setEstudianteId("");
                }}
                className="border-white/10"
              >
                Procesar otra
              </Button>
              <Link href="/evaluacion">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white">
                  Ver Evaluaciones
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result Legacy (If synchronous) */}
      {result && result.nota !== undefined && (
        <Card className="glass-card border-white/5 animate-slide-up">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Resultado
              </h3>
              <Badge className="bg-primary/15 text-primary border-0">{tipo}</Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-emerald-500">{result.nota !== undefined && result.nota !== null ? result.nota.toFixed(1) : '-'}</p>
                <p className="text-xs text-muted-foreground">/ 10.0</p>
              </div>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-4 h-4 ${s <= (Number(result.nota) / 2) ? "fill-emerald-500 text-emerald-500" : "fill-muted text-muted"}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Retroalimentación:</p>
              <p className="text-sm leading-relaxed">{result.retroalimentacion}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-white/10" onClick={() => setResult(null)}>
                Procesar otra
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
