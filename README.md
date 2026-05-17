# 🎓 EduAgent — Ecosistema de Gestión Pedagógica Inteligente con Agentes RAG

## Sede Escuela Rural Mixta El Crucero · Corporación Universitaria Comfacauca · 2026

Sistema web *mobile-first* basado en agentes inteligentes con arquitectura **RAG (Retrieval-Augmented Generation)** para automatizar la planificación curricular multigrado, generación de material didáctico y evaluación de actividades, alineados con los estándares del **Ministerio de Educación Nacional (MEN)**.

---

## 🏗️ Estructura del Proyecto

```
EduAgent/
├── frontend/          # Next.js 15 (App Router) + Tailwind CSS + shadcn/ui
├── backend/           # FastAPI (Python) — API Gateway
├── n8n-workflows/     # Flujos de trabajo n8n (orquestación IA)
```

## 🚀 Quick Start

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 📚 Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15, Tailwind CSS, shadcn/ui |
| API Gateway | FastAPI (Python) |
| Orquestación IA | n8n (self-hosted) |
| Base de datos | Supabase (PostgreSQL + pgvector) |
| LLM | OpenAI GPT-4o / OpenRouter |
| Visión | Google AI Studio (Gemini) |

## 👤 Autor

**Victor Fabio Benavidez Perez** — Desarrollo y mantenimiento del prototipo.
