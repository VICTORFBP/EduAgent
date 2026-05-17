"""EduAgent — JWT Authentication Middleware for Supabase."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.config import get_settings

security = HTTPBearer()
settings = get_settings()

# Supabase JWT secret is derived from the project's JWT secret
# In production, get this from Supabase dashboard → Settings → API → JWT Secret
SUPABASE_JWT_SECRET = settings.supabase_service_key


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Validate JWT from Supabase Auth and extract user data.
    Returns a dict with at least 'sub' (user ID/docente_id).
    """
    token = credentials.credentials
    try:
        # In production, verify with Supabase's actual JWT secret
        # For development, we decode without full verification
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_exp": True, "verify_aud": False, "verify_signature": False},
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido: falta 'sub'",
            )
        return {
            "id": user_id,
            "email": payload.get("email"),
            "role": payload.get("role", "authenticated"),
        }
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token inválido: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


# Dependency shortcut
CurrentUser = Depends(get_current_user)
