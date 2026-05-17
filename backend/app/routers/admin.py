"""EduAgent — Admin Router for managing Docentes and Estudiantes."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from app.middleware.auth_middleware import CurrentUser
from app.services.supabase_service import supabase_service

router = APIRouter()

async def require_admin(current_user: dict = CurrentUser):
    """Dependency to check if the current user has the admin role."""
    client = supabase_service.client
    if not client:
        raise HTTPException(status_code=500, detail="Supabase client not available")
    
    response = client.table("docentes").select("rol").eq("id", current_user["id"]).single().execute()
    docente = response.data
    
    if not docente or docente.get("rol") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador."
        )
    return current_user

# Models
class DocenteCreate(BaseModel):
    nombre: str
    email: str
    password: str
    grados_asignados: List[int]

class EstudianteCreate(BaseModel):
    nombre: str
    grado: int

@router.get("/docentes")
async def get_docentes(admin_user: dict = Depends(require_admin)):
    """List all docentes."""
    client = supabase_service.client
    response = client.table("docentes").select("id, nombre, grados_asignados, areas_asignadas, rol").execute()
    
    # Let's get emails from auth.users (requires RPC or admin API).
    # Since we use the service role, we can fetch all users via admin API.
    users = client.auth.admin.list_users()
    email_map = {u.id: u.email for u in users}
    
    docentes = response.data
    for doc in docentes:
        doc["email"] = email_map.get(doc["id"], "Sin correo")
        
    return docentes

@router.post("/docentes")
async def create_docente(data: DocenteCreate, admin_user: dict = Depends(require_admin)):
    """Create a new docente (Auth + Profile)."""
    client = supabase_service.client
    
    try:
        # Create Auth User
        user = client.auth.admin.create_user({
            "email": data.email,
            "password": data.password,
            "email_confirm": True
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error creando usuario: {str(e)}")

    user_id = user.user.id

    # Insert Profile
    docente_profile = {
        "id": user_id,
        "nombre": data.nombre,
        "grados_asignados": data.grados_asignados,
        "areas_asignadas": ["Matemáticas", "Lenguaje", "Ciencias Naturales", "Ciencias Sociales", "Inglés"],
        "rol": "docente"
    }
    
    try:
        client.table("docentes").insert(docente_profile).execute()
    except Exception as e:
        # Cleanup auth user if profile fails
        client.auth.admin.delete_user(user_id)
        raise HTTPException(status_code=400, detail=f"Error creando perfil docente: {str(e)}")
        
    return {"message": "Docente creado exitosamente", "id": user_id}

@router.get("/estudiantes")
async def get_estudiantes(admin_user: dict = Depends(require_admin)):
    """List all estudiantes."""
    client = supabase_service.client
    response = client.table("estudiantes").select("*").order("grado").execute()
    return response.data

@router.post("/estudiantes")
async def create_estudiante(data: EstudianteCreate, admin_user: dict = Depends(require_admin)):
    """Create a new estudiante."""
    client = supabase_service.client
    
    estudiante = {
        "nombre": data.nombre,
        "grado": data.grado,
        # We leave docente_id null. The frontend will map based on grade.
        "docente_id": None
    }
    
    response = client.table("estudiantes").insert(estudiante).execute()
    return {"message": "Estudiante creado exitosamente", "data": response.data[0]}
