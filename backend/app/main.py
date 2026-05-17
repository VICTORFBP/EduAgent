"""EduAgent Backend — FastAPI Application."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import get_settings
from app.routers import auth, planeacion, evaluacion, documentos, consulta, dashboard, admin

settings = get_settings()

app = FastAPI(
    title="EduAgent API",
    description=(
        "API Gateway para el Ecosistema de Gestión Pedagógica Inteligente "
        "con Agentes RAG — Sede Escuela Rural Mixta El Crucero"
    ),
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
app.include_router(auth.router, prefix="/auth", tags=["Autenticación"])
app.include_router(admin.router, prefix="/admin", tags=["Administración"])
app.include_router(planeacion.router, prefix="/planeacion", tags=["Planeación"])
app.include_router(evaluacion.router, prefix="/evaluacion", tags=["Evaluación"])
app.include_router(documentos.router, prefix="/documentos", tags=["Documentos"])
app.include_router(consulta.router, prefix="/consulta", tags=["Consulta RAG"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "service": "EduAgent API",
        "version": "0.1.0",
        "status": "ok",
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}
