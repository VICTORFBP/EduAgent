/* ===== EduAgent — Mock Data for Development ===== */
import type {
  Docente,
  Planeacion,
  Evaluacion,
  Documento,
  Estudiante,
  DashboardMetricas,
  ActividadReciente,
  ChatMessage,
} from "./types";

export const MOCK_DOCENTE: Docente = {
  id: "d1a2b3c4-5678-90ab-cdef-111111111111",
  nombre: "María Fernanda López",
  email: "maria.lopez@elcrucero.edu.co",
  rol: "docente",
  sede_id: "s1",
  grados_asignados: [1, 2, 3],
  areas_asignadas: ["Matemáticas", "Lenguaje", "Ciencias Naturales"],
  created_at: "2026-03-01T08:00:00Z",
};

export const MOCK_ESTUDIANTES: Estudiante[] = [
  { id: "s1", nombre: "Juan Camilo Ortiz", grado: 1, docente_id: MOCK_DOCENTE.id, sede_id: "s1", created_at: "2026-03-01T08:00:00Z", evaluaciones_count: 5, promedio_notas: 3.8 },
  { id: "s2", nombre: "Valentina Muñoz", grado: 1, docente_id: MOCK_DOCENTE.id, sede_id: "s1", created_at: "2026-03-01T08:00:00Z", evaluaciones_count: 4, promedio_notas: 4.2 },
  { id: "s3", nombre: "Santiago Rivera", grado: 2, docente_id: MOCK_DOCENTE.id, sede_id: "s1", created_at: "2026-03-01T08:00:00Z", evaluaciones_count: 6, promedio_notas: 3.5 },
  { id: "s4", nombre: "Isabella Caicedo", grado: 2, docente_id: MOCK_DOCENTE.id, sede_id: "s1", created_at: "2026-03-01T08:00:00Z", evaluaciones_count: 5, promedio_notas: 4.5 },
  { id: "s5", nombre: "Mateo Hernández", grado: 3, docente_id: MOCK_DOCENTE.id, sede_id: "s1", created_at: "2026-03-01T08:00:00Z", evaluaciones_count: 3, promedio_notas: 3.2 },
  { id: "s6", nombre: "Sofía Arboleda", grado: 3, docente_id: MOCK_DOCENTE.id, sede_id: "s1", created_at: "2026-03-01T08:00:00Z", evaluaciones_count: 7, promedio_notas: 4.8 },
  { id: "s7", nombre: "Daniel Gómez", grado: 1, docente_id: MOCK_DOCENTE.id, sede_id: "s1", created_at: "2026-03-01T08:00:00Z", evaluaciones_count: 4, promedio_notas: 3.9 },
  { id: "s8", nombre: "Luciana Paz", grado: 2, docente_id: MOCK_DOCENTE.id, sede_id: "s1", created_at: "2026-03-01T08:00:00Z", evaluaciones_count: 5, promedio_notas: 4.1 },
  { id: "s9", nombre: "Andrés Velasco", grado: 3, docente_id: MOCK_DOCENTE.id, sede_id: "s1", created_at: "2026-03-01T08:00:00Z", evaluaciones_count: 2, promedio_notas: 3.6 },
  { id: "s10", nombre: "Camila Torres", grado: 1, docente_id: MOCK_DOCENTE.id, sede_id: "s1", created_at: "2026-03-01T08:00:00Z", evaluaciones_count: 6, promedio_notas: 4.4 },
];

export const MOCK_PLANEACIONES: Planeacion[] = [
  {
    id: "p1",
    docente_id: MOCK_DOCENTE.id,
    area: "Matemáticas",
    grados: [1, 2],
    tema: "Sumas y restas con material concreto",
    contenido_generado: {
      objetivo: "Desarrollar la habilidad de resolver operaciones básicas de suma y resta utilizando material concreto del entorno rural (semillas, piedras, hojas) para fortalecer el pensamiento numérico.",
      dba_citado: "DBA Matemáticas Grado 1 #3: Resuelve problemas aditivos rutinarios de composición y transformación e interpreta condiciones necesarias para su solución.",
      indicadores: [
        { grado: 1, indicador: "Realiza sumas de una cifra con material concreto" },
        { grado: 2, indicador: "Resuelve sumas y restas de dos cifras aplicando reagrupación" },
      ],
      actividades: {
        apertura: "Caminata por el entorno escolar recolectando 20 elementos naturales (semillas de guandul, piedras pequeñas). Canción: 'Los números van marchando'. Pregunta generadora: ¿Cuántos elementos recogió cada uno?",
        desarrollo: "Grado 1: Agrupaciones de semillas para representar sumas hasta 10. Tarjetas con operaciones ilustradas. Grado 2: Problemas contextualizados con la finca — 'Si don Pedro cosechó 15 plátanos y vendió 8, ¿cuántos le quedan?'. Uso de ábaco con tapas recicladas.",
        cierre: "Socialización grupal: cada estudiante presenta un problema inventado con sus materiales. Evaluación oral entre pares.",
      },
      diferenciacion: "Grado 1 trabaja con números del 1 al 10 usando material manipulable exclusivamente. Grado 2 avanza a números de dos cifras con representación simbólica. Estudiantes avanzados de Grado 2 apoyan a Grado 1 como monitores (aprendizaje cooperativo).",
      criterios_evaluacion: "1) Precisión en las operaciones (60%). 2) Uso correcto del material concreto (20%). 3) Participación y trabajo colaborativo (20%).",
      estandar_men: "Estándar MEN Pensamiento Numérico (1°-3°): Uso diversas estrategias de cálculo y de estimación para resolver problemas en situaciones aditivas y multiplicativas.",
    },
    dba_referenciados: ["DBA Mat 1-3", "DBA Mat 2-5"],
    agente_usado: "agente_matematicas",
    tokens_consumidos: 1240,
    validada_docente: true,
    correcciones: null,
    created_at: "2026-05-08T14:30:00Z",
  },
  {
    id: "p2",
    docente_id: MOCK_DOCENTE.id,
    area: "Lenguaje",
    grados: [1, 2, 3],
    tema: "Lectura en voz alta y comprensión lectora con cuentos regionales",
    contenido_generado: {
      objetivo: "Fortalecer la comprensión lectora y la expresión oral mediante la lectura compartida de cuentos tradicionales del Patía, identificando personajes, eventos y enseñanzas.",
      dba_citado: "DBA Lenguaje Grado 2 #6: Comprende diversos tipos de texto, utilizando algunas estrategias de búsqueda, organización y almacenamiento de la información.",
      indicadores: [
        { grado: 1, indicador: "Identifica personajes principales del cuento narrado" },
        { grado: 2, indicador: "Recuenta la historia con sus propias palabras manteniendo la secuencia" },
        { grado: 3, indicador: "Identifica la enseñanza o moraleja y la relaciona con situaciones cotidianas" },
      ],
      actividades: {
        apertura: "Ronda de adivinanzas del Cauca. Presentación del cuento 'El Conejo y la Tortuga del Patía' (adaptación regional). Predicción: ¿Qué pasará en la historia?",
        desarrollo: "Lectura en voz alta con entonación y pausas dramáticas. Grado 1: Dibujar a los personajes. Grado 2: Completar organizador gráfico (inicio-nudo-desenlace). Grado 3: Escribir un final alternativo en grupo.",
        cierre: "Teatro de títeres improvisado: representar escena favorita. Conversatorio sobre valores presentes en el cuento.",
      },
      diferenciacion: "Se adaptan los productos esperados por nivel: dibujo (G1), organizador gráfico (G2) y producción textual (G3). El cuento se lee una sola vez para todos, fortaleciendo la escucha activa diferenciada.",
      criterios_evaluacion: "1) Comprensión del contenido (40%). 2) Calidad del producto (dibujo/texto) (30%). 3) Participación oral (30%).",
      estandar_men: "Estándar MEN Comprensión e Interpretación Textual (1°-3°): Comprendo textos que tienen diferentes formatos y finalidades.",
    },
    dba_referenciados: ["DBA Leng 2-6", "DBA Leng 1-3", "DBA Leng 3-8"],
    agente_usado: "agente_lenguaje",
    tokens_consumidos: 1580,
    validada_docente: true,
    correcciones: "Agregar más tiempo para la actividad de títeres. Los niños necesitan al menos 15 minutos.",
    created_at: "2026-05-07T10:15:00Z",
  },
  {
    id: "p3",
    docente_id: MOCK_DOCENTE.id,
    area: "Ciencias Naturales",
    grados: [2, 3],
    tema: "El ciclo del agua observado en el entorno",
    contenido_generado: {
      objetivo: "Comprender las fases del ciclo del agua mediante la observación directa del entorno rural y experimentos sencillos con materiales disponibles.",
      dba_citado: "DBA Ciencias Naturales Grado 3 #4: Comprende la influencia de la variación de la temperatura en los cambios de estado de la materia.",
      indicadores: [
        { grado: 2, indicador: "Nombra las fases del ciclo del agua" },
        { grado: 3, indicador: "Explica cómo se relaciona el ciclo del agua con la lluvia de su vereda" },
      ],
      actividades: {
        apertura: "Observar el cielo y el río cercano. Preguntas: ¿A dónde va el agua del río? ¿De dónde viene la lluvia?",
        desarrollo: "Experimento: hervir agua en olla (supervisado), observar vapor condensándose en tapa fría. Grado 2: Colorear diagrama del ciclo. Grado 3: Escribir explicación científica con vocabulario técnico.",
        cierre: "Maqueta grupal del ciclo del agua con materiales reciclados (botella plástica, tierra, agua).",
      },
      diferenciacion: "Grado 2: enfoque visual y manipulativo. Grado 3: incorpora vocabulario técnico (evaporación, condensación, precipitación) y relación con el clima local.",
      criterios_evaluacion: "1) Identificación de fases (40%). 2) Participación en experimento (30%). 3) Producto final (maqueta/dibujo) (30%).",
      estandar_men: "Estándar MEN Entorno Físico (1°-3°): Identifico y describo la flora, fauna, agua y suelo de mi entorno.",
    },
    dba_referenciados: ["DBA CN 3-4"],
    agente_usado: "agente_general",
    tokens_consumidos: 1100,
    validada_docente: false,
    correcciones: null,
    created_at: "2026-05-10T09:00:00Z",
  },
];

export const MOCK_EVALUACIONES: Evaluacion[] = [
  { id: "e1", estudiante_id: "s1", estudiante_nombre: "Juan Camilo Ortiz", docente_id: MOCK_DOCENTE.id, area: "Matemáticas", tipo: "estandarizada", archivo_path: "/evaluaciones/e1.jpg", nota: 3.5, retroalimentacion: "Juan Camilo demuestra comprensión de sumas básicas. Necesita reforzar restas con préstamo. Se sugiere práctica adicional con material concreto.", procesado_correctamente: true, error_ocr: null, created_at: "2026-05-09T11:00:00Z" },
  { id: "e2", estudiante_id: "s2", estudiante_nombre: "Valentina Muñoz", docente_id: MOCK_DOCENTE.id, area: "Matemáticas", tipo: "estandarizada", archivo_path: "/evaluaciones/e2.jpg", nota: 4.5, retroalimentacion: "Excelente desempeño. Valentina resuelve correctamente 9/10 operaciones incluyendo reagrupación.", procesado_correctamente: true, error_ocr: null, created_at: "2026-05-09T11:05:00Z" },
  { id: "e3", estudiante_id: "s3", estudiante_nombre: "Santiago Rivera", docente_id: MOCK_DOCENTE.id, area: "Lenguaje", tipo: "abierta", archivo_path: "/evaluaciones/e3.pdf", nota: 3.0, retroalimentacion: "Santiago identifica personajes pero tiene dificultad para reconstruir la secuencia narrativa. Se recomienda más práctica con organizadores gráficos.", procesado_correctamente: true, error_ocr: null, created_at: "2026-05-08T14:00:00Z" },
  { id: "e4", estudiante_id: "s6", estudiante_nombre: "Sofía Arboleda", docente_id: MOCK_DOCENTE.id, area: "Lenguaje", tipo: "abierta", archivo_path: "/evaluaciones/e4.pdf", nota: 4.8, retroalimentacion: "Producción textual sobresaliente. Sofía escribe con coherencia, usa conectores y demuestra creatividad en su final alternativo del cuento.", procesado_correctamente: true, error_ocr: null, created_at: "2026-05-08T14:10:00Z" },
  { id: "e5", estudiante_id: "s5", estudiante_nombre: "Mateo Hernández", docente_id: MOCK_DOCENTE.id, area: "Ciencias Naturales", tipo: "abierta", archivo_path: "/evaluaciones/e5.jpg", nota: null, retroalimentacion: null, procesado_correctamente: false, error_ocr: "Imagen borrosa. No se pudo procesar la escritura.", created_at: "2026-05-10T10:00:00Z" },
];

export const MOCK_DOCUMENTOS: Documento[] = [
  { id: "doc1", docente_id: MOCK_DOCENTE.id, nombre: "DBA Matemáticas v2 (2016)", tipo: "MEN_OFICIAL", storage_path: "/documentos/dba_matematicas_v2.pdf", area: "Matemáticas", grado: null, vectorizado: true, created_at: "2026-03-15T08:00:00Z" },
  { id: "doc2", docente_id: MOCK_DOCENTE.id, nombre: "DBA Lenguaje v2 (2016)", tipo: "MEN_OFICIAL", storage_path: "/documentos/dba_lenguaje_v2.pdf", area: "Lenguaje", grado: null, vectorizado: true, created_at: "2026-03-15T08:00:00Z" },
  { id: "doc3", docente_id: MOCK_DOCENTE.id, nombre: "DBA Ciencias Naturales v1 (2016)", tipo: "MEN_OFICIAL", storage_path: "/documentos/dba_ciencias_v1.pdf", area: "Ciencias Naturales", grado: null, vectorizado: true, created_at: "2026-03-15T08:00:00Z" },
  { id: "doc4", docente_id: MOCK_DOCENTE.id, nombre: "DBA Ciencias Sociales v1 (2016)", tipo: "MEN_OFICIAL", storage_path: "/documentos/dba_sociales_v1.pdf", area: "Ciencias Sociales", grado: null, vectorizado: true, created_at: "2026-03-15T08:00:00Z" },
  { id: "doc5", docente_id: MOCK_DOCENTE.id, nombre: "Estándares Básicos de Competencias MEN (2006)", tipo: "MEN_OFICIAL", storage_path: "/documentos/estandares_men_2006.pdf", area: null, grado: null, vectorizado: true, created_at: "2026-03-15T08:00:00Z" },
  { id: "doc6", docente_id: MOCK_DOCENTE.id, nombre: "Guía Escuela Nueva - Matemáticas Grado 1", tipo: "DOCENTE_CUSTOM", storage_path: "/documentos/guia_en_mat_g1.pdf", area: "Matemáticas", grado: 1, vectorizado: true, created_at: "2026-04-20T10:00:00Z" },
  { id: "doc7", docente_id: MOCK_DOCENTE.id, nombre: "Plan de aula segundo periodo 2026", tipo: "DOCENTE_CUSTOM", storage_path: "/documentos/plan_aula_p2.pdf", area: null, grado: null, vectorizado: false, created_at: "2026-05-10T09:00:00Z" },
];

export const MOCK_METRICAS: DashboardMetricas = {
  planeaciones_mes: 12,
  evaluaciones_procesadas: 34,
  tiempo_ahorrado_horas: 8.5,
  tasa_alineacion_men: 92,
  documentos_cargados: 7,
  estudiantes_total: 22,
};

export const MOCK_ACTIVIDAD: ActividadReciente[] = [
  { id: "a1", tipo: "planeacion", descripcion: "Planeación generada: El ciclo del agua (CN, grados 2-3)", timestamp: "2026-05-10T09:00:00Z" },
  { id: "a2", tipo: "evaluacion", descripcion: "Evaluación procesada: Mateo Hernández — Error OCR", timestamp: "2026-05-10T10:00:00Z" },
  { id: "a3", tipo: "documento", descripcion: "Documento cargado: Plan de aula segundo periodo 2026", timestamp: "2026-05-10T09:00:00Z" },
  { id: "a4", tipo: "evaluacion", descripcion: "4 evaluaciones procesadas — Matemáticas grado 1", timestamp: "2026-05-09T11:00:00Z" },
  { id: "a5", tipo: "planeacion", descripcion: "Planeación validada: Sumas y restas con material concreto", timestamp: "2026-05-08T14:30:00Z" },
  { id: "a6", tipo: "consulta", descripcion: "Consulta RAG: ¿Qué DBA aplican a pensamiento aleatorio grado 3?", timestamp: "2026-05-08T16:00:00Z" },
];

export const MOCK_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    role: "user",
    content: "¿Cuáles son los DBA de Matemáticas para grado 2 relacionados con pensamiento numérico?",
    timestamp: "2026-05-08T16:00:00Z",
  },
  {
    id: "m2",
    role: "assistant",
    content: "Según los **DBA de Matemáticas v2 (2016)**, los derechos básicos de aprendizaje para **Grado 2** relacionados con **pensamiento numérico** son:\n\n1. **DBA 1**: Interpreta, formula y resuelve problemas aditivos de composición, transformación y comparación en diferentes contextos; y multiplicativos, directos e inversos, en diferentes contextos.\n\n2. **DBA 3**: Utiliza diferentes estrategias para calcular (sumas, restas, multiplicaciones) o estimar el resultado de una operación.\n\n3. **DBA 5**: Identifica y utiliza propiedades de los números (ser par, ser impar, etc.) y relaciones entre ellos (ser mayor que, ser menor que, ser múltiplo de, ser divisible por, etc.) en diferentes contextos.\n\nEstos DBA están alineados con el **Estándar MEN de Pensamiento Numérico (1°-3°)**: *\"Uso diversas estrategias de cálculo y de estimación para resolver problemas en situaciones aditivas y multiplicativas.\"*",
    sources: [
      { documento_nombre: "DBA Matemáticas v2 (2016)", fragmento: "Grado 2, DBA 1-5, Pensamiento Numérico...", relevancia: 0.95 },
      { documento_nombre: "Estándares Básicos de Competencias MEN (2006)", fragmento: "Pensamiento Numérico y Sistemas Numéricos...", relevancia: 0.82 },
    ],
    timestamp: "2026-05-08T16:00:05Z",
  },
];
