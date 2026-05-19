"""EduAgent — Auth Router."""

from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import get_current_user
from app.services.supabase_service import supabase_service

router = APIRouter()


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the currently authenticated docente's data."""
    docente_id = current_user["id"]
    profile = await supabase_service.get_docente(docente_id)
    if profile:
        return {
            "id": profile["id"],
            "email": profile.get("email", current_user.get("email")),
            "nombre": profile.get("nombre", "Docente Autenticado"),
            "grados_asignados": profile.get("grados_asignados", [1, 2, 3]),
            "areas_asignadas": profile.get("areas_asignadas", ["Matemáticas", "Lenguaje", "Ciencias Naturales"]),
        }
    return {
        "id": current_user["id"],
        "email": current_user.get("email"),
        "nombre": "Docente Autenticado",
        "grados_asignados": [1, 2, 3],
        "areas_asignadas": ["Matemáticas", "Lenguaje", "Ciencias Naturales"],
    }
