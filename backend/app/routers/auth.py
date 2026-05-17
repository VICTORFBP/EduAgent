"""EduAgent — Auth Router."""

from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import get_current_user

router = APIRouter()


@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get the currently authenticated docente's data."""
    # In production, fetch full docente profile from Supabase
    return {
        "id": current_user["id"],
        "email": current_user.get("email"),
        "nombre": "Docente Autenticado",
        "grados_asignados": [1, 2, 3],
        "areas_asignadas": ["Matemáticas", "Lenguaje", "Ciencias Naturales"],
    }
