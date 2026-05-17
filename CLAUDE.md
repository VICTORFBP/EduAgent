# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Frontend (Next.js 16 + Tailwind CSS)
- **Install dependencies**: `npm install`
- **Start dev server**: `npm run dev`
- **Build for production**: `npm run build`
- **Run production server**: `npm run start`
- **Lint**: `npm run lint`
- **Run tests** (if a test script is added): `npm run test` – currently the project does not include a test runner for the frontend.

### Backend (FastAPI Python API)
- **Create a virtual environment** (optional but recommended): `python -m venv venv && source venv/bin/activate`
- **Install dependencies**: `pip install -r requirements.txt`
- **Run API locally (with hot‑reload)**: `uvicorn app.main:app --reload`
- **Run unit/integration tests** (pytest is a common choice): `pytest path/to/test_file.py` – e.g., `pytest backend/test_db_rest.py`

### n8n Workflows (IA orchestration)
- The `n8n-workflows/` folder contains JSON workflow definitions for the self‑hosted n8n instance. Deploy them with the n8n UI or CLI as appropriate for the environment.

## High‑Level Architecture

- **Frontend (`frontend/`)**: A Next.js 16 app using the App Router, Tailwind CSS, and shadcn/ui components. It communicates with the backend via HTTP API calls and with Supabase directly for client‑side data fetching when needed.
- **Backend (`backend/`)**: A FastAPI service that acts as the primary API gateway. It handles authentication, routes requests to the RAG pipeline, and interacts with Supabase (PostgreSQL + pgvector) for vector storage.
- **RAG Pipeline**: Retrieval‑augmented generation is orchestrated by **n8n** workflows. The workflows pull documents from Supabase, embed them using the configured LLM, and store/query vectors for contextual responses.
- **Database**: Supabase provides both relational tables (PostgreSQL) and vector search capabilities via pgvector. All persistent educational content and embeddings live here.
- **LLM Integration**: The system uses OpenAI GPT‑4o (or OpenRouter) for generation and Google AI Studio (Gemini) for vision tasks. Calls are made from the backend.
- **Deployment**: Typically deployed on Vercel (frontend) and a containerized environment for the backend (Dockerfile provided). n8n runs as a separate service, often in Docker as well.

## Notable Files & Directories
- `frontend/next.config.ts` – Next.js configuration (including experimental features).
- `frontend/tsconfig.json` – TypeScript settings shared across the UI.
- `backend/app/` – FastAPI application entry point (`main.py`).
- `backend/requirements.txt` – Python dependencies.
- `n8n-workflows/` – n8n workflow JSON files that define the RAG orchestration.
- `PRD_EcosistemaRAG_ElCrucero.md` – Project requirements document providing domain context.

## Existing Guidance Rules
- No `.cursor` or `.cursorrules` files are present.
- No `.github/copilot-instructions.md` file is present.
- The `frontend/AGENTS.md` notes that this Next.js version may have breaking changes; consult the docs under `node_modules/next/dist/docs/` before making core framework changes.

---
*End of CLAUDE.md*