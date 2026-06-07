/* ===== EduAgent — TypeScript Types ===== */

// ---- Sedes ----
export interface Sede {
  id: string;
  nombre: string;
  municipio: string | null;
  descripcion: string | null;
  activa: boolean;
  created_at: string;
}

// ---- Auth & Docentes ----
export interface Docente {
  id: string;
  nombre: string;
  email: string;
  rol: "admin" | "docente";
  grados_asignados: number[];
  areas_asignadas: string[];
  sede_id: string | null;
  sedes?: { nombre: string; municipio: string | null } | null;
  created_at: string;
}

// ---- Planeaciones ----
export interface PlaneacionContenido {
  objetivo: string;
  dba_citado: string;
  indicadores: { grado: number; indicador: string }[];
  actividades: {
    apertura: string;
    desarrollo: string;
    cierre: string;
  };
  diferenciacion: string;
  criterios_evaluacion: string;
  estandar_men: string;
}

export interface Planeacion {
  id: string;
  docente_id: string;
  area: string;
  grados: number[];
  tema: string;
  contenido_generado: PlaneacionContenido;
  dba_referenciados: string[];
  agente_usado: string;
  tokens_consumidos: number;
  validada_docente: boolean;
  correcciones: string | null;
  created_at: string;
}

export interface PlaneacionCreateRequest {
  area: string;
  grados: number[];
  tema: string;
  duracion: number;
  recursos: string;
}

// ---- Evaluaciones ----
export interface Evaluacion {
  id: string;
  estudiante_id: string;
  estudiante_nombre?: string;
  docente_id: string;
  area: string;
  tipo: "estandarizada" | "abierta";
  archivo_path: string | null;
  nota: number | null;
  retroalimentacion: string | null;
  procesado_correctamente: boolean;
  error_ocr: string | null;
  created_at: string;
}

// ---- Documentos ----
export interface Documento {
  id: string;
  docente_id: string;
  nombre: string;
  tipo: "MEN_OFICIAL" | "DOCENTE_CUSTOM";
  storage_path: string;
  area: string | null;
  grado: number | null;
  vectorizado: boolean;
  created_at: string;
}

// ---- Estudiantes ----
export interface Estudiante {
  id: string;
  nombre: string;
  grado: number;
  docente_id: string;
  sede_id: string | null;
  sedes?: { nombre: string } | null;
  created_at: string;
  evaluaciones_count?: number;
  promedio_notas?: number;
}

// ---- Consulta RAG ----
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  timestamp: string;
}

export interface ChatSource {
  documento_nombre: string;
  fragmento: string;
  relevancia: number;
}

// ---- Dashboard ----
export interface DashboardMetricas {
  planeaciones_mes: number;
  evaluaciones_procesadas: number;
  tiempo_ahorrado_horas: number;
  tasa_alineacion_men: number;
  documentos_cargados: number;
  estudiantes_total: number;
}

export interface ActividadReciente {
  id: string;
  tipo: "planeacion" | "evaluacion" | "consulta" | "documento";
  descripcion: string;
  timestamp: string;
}

// ---- Interaction Logs ----
export interface InteractionLog {
  id: string;
  docente_id: string;
  modulo: string;
  accion: string;
  duracion_ms: number;
  tokens_usados: number;
  exitoso: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ---- Métricas del Piloto ----
export interface PilotMetrics {
  tiempo_promedio_planeacion_ms: number;
  tiempo_ahorrado_horas: number;
  tasa_alineacion_men: number;        // 0-100
  tasa_correccion_rag: number;        // 0-100
  tasa_exito_ocr: number;             // 0-100
  total_planeaciones: number;
  total_evaluaciones: number;
  total_evaluaciones_ok: number;
  total_planeaciones_validadas: number;
  total_planeaciones_corregidas: number;
}

// ---- Áreas y constantes ----
export const AREAS = [
  "Matemáticas",
  "Lenguaje",
  "Ciencias Naturales",
  "Ciencias Sociales",
  "Ética",
  "Artística",
] as const;

export type Area = (typeof AREAS)[number];

export const GRADOS = [1, 2, 3, 4, 5] as const;

export const AREA_COLORS: Record<string, string> = {
  "Matemáticas": "bg-sky-500/15 text-sky-600 dark:text-sky-400",
  "Lenguaje": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "Ciencias Naturales": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "Ciencias Sociales": "bg-purple-500/15 text-purple-600 dark:text-purple-400",
  "Ética": "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  "Artística": "bg-orange-500/15 text-orange-600 dark:text-orange-400",
};

export const AREA_ICONS: Record<string, string> = {
  "Matemáticas": "calculator",
  "Lenguaje": "book-open",
  "Ciencias Naturales": "leaf",
  "Ciencias Sociales": "globe",
  "Ética": "heart",
  "Artística": "palette",
};
