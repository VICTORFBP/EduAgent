# Requisitos del Ecosistema de Gestión Pedagógica Inteligente

## Requisitos Funcionales

### Orquestación Multiagente
- [x] Agente especializado en Matemáticas
- [x] Agente especializado en Lenguaje
- [x] Agente General para áreas complementarias
- [x] Los agentes justifican respuestas en base a estándares MEN

### Evaluación Híbrida
- [x] Calificación mediante hojas de respuestas estandarizadas
- [x] Análisis de respuestas abiertas (procedimientos matemáticos, fórmulas, comprensión lectora)
- [x] Análisis Multimodal para interpretar imágenes de evaluaciones

### Retroalimentación Pedagógica
- [x] Generación de calificación cuantitativa automatizada
- [x] Generación de explicación cualitativa o guía detallada como retroalimentación

### Persistencia y Trazabilidad
- [x] Base de datos relacional PostgreSQL para historial de progreso individual del estudiante
- [x] Seguimiento longitudinal del estudiante accesible para el docente

### Procesamiento RAG
- [x] El sistema consulta documentos oficiales del MEN antes de generar respuestas
- [x] El docente puede cargar material de apoyo en formato PDF
- [x] La arquitectura RAG procesa y contextualiza el material cargado

### Segmentación Multigrado
- [x] Generación de contenido adaptado al nivel académico del estudiante
- [x] Diferenciación curricular por grado

---

## Requisitos Técnicos

### Interfaz
- [x] Aplicación Web con enfoque mobile-first
- [x] Accesible desde dispositivos en la sede

### Módulo de Autenticación
- [x] Gestión segura de usuarios docentes

### Módulo de Carga de Documentos
- [x] Permite cargar referentes curriculares en formato PDF
- [x] Acepta evaluaciones en formato JPG y PDF

### Módulo de Consulta de Documentos
- [x] Consulta de documentos oficiales del MEN
- [x] Consulta de documentos cargados por el docente

### Base Vectorial
- [x] Almacenamiento de información en vectores
- [x] Permite recuperación aumentada (RAG)

### Registro de Uso
- [x] Captura automatizada de interacciones docentes
- [x] Registro de métricas de utilización del sistema (logs en Supabase)

### Panel Dashboard
- [x] Visualización de planeaciones generadas
- [x] Visualización de evaluaciones realizadas
- [x] Visualización del progreso de estudiantes

### Procesamiento Multimodal
- [x] Interpretación de imágenes de evaluaciones
- [x] Identificación de procedimientos en respuestas abiertas

### Motor de Orquestación (n8n)
- [x] Flujos de trabajo automatizados para gestión de agentes
- [x] Lógica de routing entre frontend y modelos de lenguaje
- [x] Ingesta de documentos PDF a la base vectorial
- [x] Validación de respuestas antes de persistirlas en Supabase

### Memoria del Sistema
- [x] Base de datos relacional (PostgreSQL) para metadatos de alumnos
- [x] Sincronización entre la base relacional y el ecosistema

---

## Arquitectura Multiagente

### Composición de Agentes
- [x] El sistema implementa un mínimo de 3 agentes: Matemáticas, Lenguaje y Agente General
- [x] Cada agente está especializado por área del conocimiento
- [x] El Agente General cubre áreas complementarias no asignadas a agentes especializados
- [x] Los agentes operan de forma integrada (colaboración interdependiente)

### Capacidades de Cada Agente
- [x] Cada agente puede recuperar información curricular oficial (DBA y Estándares MEN) antes de responder
- [x] Cada agente puede generar planeaciones de clase adaptadas al grado indicado
- [x] Cada agente justifica sus respuestas citando los estándares MEN aplicables
- [x] Los agentes soportan segmentación multigrado (adaptan el contenido según el nivel)

### RAG Agéntico
- [🟡] Los agentes no solo recuperan y responden, sino que seleccionan herramientas de forma proactiva *(Parcial: La orquestación actual es imperativa/predefinida en el backend, no un modelo ReAct puro)*
- [❌] Los agentes pueden ajustar su estrategia de ejecución según el contexto de la consulta *(El flujo está rígidamente definido en el backend)*
- [x] Los agentes someten sus resultados a un proceso de crítica interna antes de responder *(Implementado mediante `verification_service`)*
- [❌] El flujo de recuperación es dinámico (RAG Agéntico), no una secuencia estática *(La secuencia actual de recuperación es estática)*

### Orquestación con n8n
- [🟡] n8n actúa como orquestador central entre los agentes y el frontend *(Parcial: FastAPI es el orquestador principal; n8n se encarga de la ingesta y flujos específicos)*
- [🟡] n8n gestiona el routing de consultas hacia el agente especializado correcto *(El routing principal lo realiza FastAPI)*
- [x] n8n coordina la ingesta de PDFs a la base vectorial
- [🟡] n8n valida las respuestas de los agentes antes de persistirlas en Supabase *(La validación la hace FastAPI mediante Gemini Vision / OpenRouter)*
- [x] La latencia de orquestación es aceptable para uso en aula (referencia del documento: < 0.4 s) *(Cumplido, la latencia de red/orquestación es de ~100-200ms excluyendo el LLM)*

### Interacción entre Agentes y RAG
- [x] Los agentes consultan la base vectorial antes de generar cualquier respuesta
- [x] La base vectorial contiene indexados los documentos oficiales del MEN (DBA, Estándares)
- [x] La base vectorial se actualiza cuando el docente carga nuevos documentos PDF
- [x] Los agentes pueden distinguir entre fuentes oficiales MEN y material cargado por el docente *(A través de los metadatos de Pinecone)*

### Trazabilidad de Agentes
- [x] Cada interacción con un agente queda registrada en Supabase (logs)
- [x] El sistema identifica qué agente atendió cada consulta
- [x] El sistema registra si el docente corrigió o rechazó la respuesta generada por un agente

---

## Requisitos No Funcionales / Limitaciones a Gestionar

- [🟡] El sistema debe operar con conectividad rural limitada o inestable *(Es web, requiere conexión pero usa SVG ligeros)*
- [x] Dependencia de APIs externas de LLM (OpenAI, OpenRouter) documentada y gestionada
- [x] Toda planificación generada requiere validación del docente antes de aplicarse
- [x] Tratamiento de datos de menores cumple con Ley 1581 de 2012 y Decreto 1377 de 2013 *(Consentimiento físico gestionado)*
- [x] Consentimiento informado de padres/acudientes obtenido antes del piloto *(Físico)*
- [x] Los registros de evaluación y progreso son anonimizados en análisis y reportes *(Nombres no se envían al LLM en evaluación)*

---

## Requisitos de Métricas (Evaluación del Piloto)

- [x] El sistema registra el tiempo invertido en planeación por docente
- [x] El sistema permite calcular % de reducción de tiempo vs. línea base
- [x] El sistema permite calcular % de alineación de planeaciones con estándares MEN
- [x] El sistema registra respuestas corregidas/rechazadas por el docente (tasa de corrección RAG)
- [x] El sistema registra evaluaciones procesadas correctamente vs. total cargadas (% éxito OCR)
- [❌] El sistema soporta encuesta de satisfacción Likert 1–5 (usabilidad, precisión, carga laboral, uso futuro) *(Se realizará fuera de la plataforma)*
