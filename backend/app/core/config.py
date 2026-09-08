"""
Central configuration for UniVerse AI 2026.
All settings are loadable via environment variables (.env) with safe local defaults
so the platform runs out-of-the-box on a CPU-only Windows 11 laptop.
"""
from pydantic_settings import BaseSettings
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend/


class Settings(BaseSettings):
    APP_NAME: str = "UniVerse AI 2026"
    ENV: str = "local"

    # --- Database ---
    DATABASE_URL: str = f"sqlite:///{BASE_DIR / 'universe.db'}"

    # --- Auth ---
    SECRET_KEY: str = "change-this-secret-in-production-2026-universeai"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12  # 12 hours

    # --- ML artifacts ---
    ML_MODELS_DIR: Path = BASE_DIR / "app" / "ml" / "artifacts"

    # --- RAG ---
    RAG_INDEX_DIR: Path = BASE_DIR / "app" / "rag" / "index"
    RAG_DOCS_DIR: Path = BASE_DIR / "app" / "rag" / "documents"

    # --- Business rules ---
    ATTENDANCE_ELIGIBILITY_THRESHOLD: float = 75.0

    # --- CORS ---
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ]

    class Config:
        env_file = ".env"


settings = Settings()
settings.ML_MODELS_DIR.mkdir(parents=True, exist_ok=True)
settings.RAG_INDEX_DIR.mkdir(parents=True, exist_ok=True)
settings.RAG_DOCS_DIR.mkdir(parents=True, exist_ok=True)
