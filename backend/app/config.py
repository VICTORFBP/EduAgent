"""EduAgent Backend — Configuration via environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    # --- Supabase ---
    supabase_url: str = "https://xxxx.supabase.co"
    supabase_service_key: str = ""

    # --- n8n Webhooks ---
    n8n_base_url: str = "http://localhost:5678"
    n8n_api_key: str = ""
    n8n_webhook_ingesta: str = "http://localhost:5678/webhook/ingesta-pdf"
    n8n_webhook_planeacion: str = "http://localhost:5678/webhook/planeacion"
    n8n_webhook_evaluacion: str = "http://localhost:5678/webhook/evaluacion-vision"
    n8n_webhook_consulta: str = "http://localhost:5678/webhook/consulta"
    n8n_webhook_verificar: str = "http://localhost:5678/webhook/verificar-actividad"
    n8n_webhook_secret: str = ""

    # --- OpenAI Agent ---
    openai_api_key: str = ""
    agent_model: str = "gpt-4o-mini"

    # --- App ---
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
