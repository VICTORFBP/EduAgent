"""EduAgent — Admin Router: manage sedes, docentes, and estudiantes."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from app.middleware.auth_middleware import CurrentUser
from app.services.supabase_service import supabase_service

router = APIRouter()


# ──────────────────────────────────────────────
# Auth dependency
# ──────────────────────────────────────────────

async def require_admin(current_user: dict = CurrentUser) -> dict:
    """Dependency: only users with rol='admin' can access admin endpoints."""
    client = supabase_service.client
    if not client:
        raise HTTPException(status_code=500, detail="Supabase client not available")

    response = (
        client.table("docentes")
        .select("rol")
        .eq("id", current_user["id"])
        .single()
        .execute()
    )
    if not response.data or response.data.get("rol") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador.",
        )
    return current_user


# ──────────────────────────────────────────────
# Pydantic Models
# ──────────────────────────────────────────────

class SedeCreate(BaseModel):
    nombre: str
    municipio: Optional[str] = None
    descripcion: Optional[str] = None


class SedeUpdate(BaseModel):
    nombre: Optional[str] = None
    municipio: Optional[str] = None
    descripcion: Optional[str] = None
    activa: Optional[bool] = None


class DocenteCreate(BaseModel):
    nombre: str
    email: str
    password: str
    grados_asignados: List[int]
    sede_id: str
    areas_asignadas: Optional[List[str]] = None


class EstudianteCreate(BaseModel):
    nombre: str
    grado: int
    sede_id: str
    docente_id: str


class EstudianteUpdate(BaseModel):
    nombre: Optional[str] = None
    grado: Optional[int] = None
    docente_id: Optional[str] = None


# ──────────────────────────────────────────────
# Sedes
# ──────────────────────────────────────────────

@router.get("/sedes")
async def get_sedes(admin_user: dict = Depends(require_admin)):
    """List all sedes."""
    return await supabase_service.get_sedes()


@router.post("/sedes", status_code=status.HTTP_201_CREATED)
async def create_sede(data: SedeCreate, admin_user: dict = Depends(require_admin)):
    """Create a new sede."""
    sede = await supabase_service.create_sede(data.model_dump(exclude_none=True))
    return {"message": "Sede creada exitosamente", "data": sede}


@router.put("/sedes/{sede_id}")
async def update_sede(
    sede_id: str,
    data: SedeUpdate,
    admin_user: dict = Depends(require_admin),
):
    """Update an existing sede."""
    result = await supabase_service.update_sede(
        sede_id, data.model_dump(exclude_none=True)
    )
    if not result:
        raise HTTPException(status_code=404, detail="Sede no encontrada.")
    return {"message": "Sede actualizada", "data": result}


# ──────────────────────────────────────────────
# Docentes
# ──────────────────────────────────────────────

@router.get("/docentes")
async def get_docentes(admin_user: dict = Depends(require_admin)):
    """List all docentes with sede information."""
    client = supabase_service.client

    docentes = await supabase_service.get_all_docentes()

    # Enrich with email from Supabase Auth
    try:
        users = client.auth.admin.list_users()
        email_map = {u.id: u.email for u in users}
        for doc in docentes:
            doc["email"] = email_map.get(doc["id"], "Sin correo")
    except Exception:
        for doc in docentes:
            doc.setdefault("email", "Sin correo")

    return docentes


@router.post("/docentes", status_code=status.HTTP_201_CREATED)
async def create_docente(
    data: DocenteCreate, admin_user: dict = Depends(require_admin)
):
    """Create a new docente (Auth user + profile)."""
    client = supabase_service.client

    # 1. Create Supabase Auth user
    try:
        user = client.auth.admin.create_user({
            "email": data.email,
            "password": data.password,
            "email_confirm": True,
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creando usuario: {str(e)}")

    user_id = user.user.id

    # 2. Insert docente profile
    areas = data.areas_asignadas or [
        "Matemáticas", "Lenguaje", "Ciencias Naturales", "Ciencias Sociales", "Inglés"
    ]
    profile = {
        "id": user_id,
        "nombre": data.nombre,
        "grados_asignados": data.grados_asignados,
        "areas_asignadas": areas,
        "rol": "docente",
        "sede_id": data.sede_id,
    }

    try:
        client.table("docentes").insert(profile).execute()
    except Exception as e:
        client.auth.admin.delete_user(user_id)
        raise HTTPException(
            status_code=400, detail=f"Error creando perfil docente: {str(e)}"
        )

    return {"message": "Docente creado exitosamente", "id": user_id}


@router.delete("/docentes/{docente_id}", status_code=status.HTTP_200_OK)
async def delete_docente(
    docente_id: str, admin_user: dict = Depends(require_admin)
):
    """Delete a docente (profile + auth user)."""
    client = supabase_service.client

    # Prevent self-deletion
    if docente_id == admin_user["id"]:
        raise HTTPException(
            status_code=400, detail="No puedes eliminarte a ti mismo."
        )

    # Prevent deleting another admin
    rol = await supabase_service.get_docente_rol(docente_id)
    if rol == "admin":
        raise HTTPException(
            status_code=403, detail="No puedes eliminar a otro administrador."
        )

    await supabase_service.delete_docente_profile(docente_id)
    try:
        client.auth.admin.delete_user(docente_id)
    except Exception as e:
        logger_warning = f"Profile deleted but auth user deletion failed: {e}"
        pass

    return {"message": "Docente eliminado correctamente."}


# ──────────────────────────────────────────────
# Estudiantes
# ──────────────────────────────────────────────

@router.get("/estudiantes")
async def get_estudiantes(admin_user: dict = Depends(require_admin)):
    """List all estudiantes (admin sees all sedes)."""
    return await supabase_service.get_all_estudiantes()


@router.post("/estudiantes", status_code=status.HTTP_201_CREATED)
async def create_estudiante(
    data: EstudianteCreate, admin_user: dict = Depends(require_admin)
):
    """Create a new estudiante linked to a sede and docente."""
    estudiante = {
        "nombre": data.nombre,
        "grado": data.grado,
        "sede_id": data.sede_id,
        "docente_id": data.docente_id,
    }
    result = await supabase_service.create_estudiante(estudiante)
    return {"message": "Estudiante registrado exitosamente", "data": result}


@router.delete("/estudiantes/{estudiante_id}", status_code=status.HTTP_200_OK)
async def delete_estudiante(
    estudiante_id: str, admin_user: dict = Depends(require_admin)
):
    """Delete an estudiante."""
    await supabase_service.delete_estudiante(estudiante_id)
    return {"message": "Estudiante eliminado correctamente."}


# ──────────────────────────────────────────────
# Métricas del Piloto (admin only)
# ──────────────────────────────────────────────

@router.get("/metricas-piloto")
async def get_metricas_piloto_global(admin_user: dict = Depends(require_admin)):
    """Return aggregated pilot metrics across all docentes."""
    return await supabase_service.get_global_pilot_metrics()
