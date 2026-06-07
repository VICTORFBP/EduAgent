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
