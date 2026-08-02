"""EduAgent Backend — Configuration via environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    # --- Supabase ---
    supabase_url: str = "https://xxxx.supabase.co"
    supabase_service_key: str = ""

    # --- OpenAI ---
    openai_api_key: str = ""
    agent_model: str = "gpt-4o-mini"
    openai_generation_model: str = "gpt-4o-mini"
    openai_vision_model: str = "gpt-4o"
    openai_embedding_model: str = "text-embedding-3-small"

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
