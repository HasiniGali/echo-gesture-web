from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent
load_dotenv(BACKEND_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    database_path: Path
    model_path: Path | None
    vocabulary_path: Path | None
    inference_preprocessing_verified: bool
    rejection_threshold: float
    google_translate_api_key: str | None
    cors_origins: tuple[str, ...]


def get_settings() -> Settings:
    database_path = Path(os.getenv("ECHOGESTURE_DATABASE_PATH", str(BACKEND_DIR / "data" / "echogesture.sqlite3"))).expanduser()
    model_value = os.getenv("ECHOGESTURE_MODEL_PATH", "").strip()
    vocabulary_value = os.getenv("ECHOGESTURE_VOCABULARY_PATH", "").strip()
    origins = tuple(
        origin.strip()
        for origin in os.getenv("ECHOGESTURE_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
        if origin.strip()
    )
    threshold = float(os.getenv("ECHOGESTURE_REJECTION_THRESHOLD", "0.60"))
    if not 0 <= threshold <= 1:
        raise ValueError("ECHOGESTURE_REJECTION_THRESHOLD must be between 0 and 1")
    return Settings(
        database_path=database_path,
        model_path=Path(model_value).expanduser() if model_value else None,
        vocabulary_path=Path(vocabulary_value).expanduser() if vocabulary_value else None,
        inference_preprocessing_verified=os.getenv(
            "ECHOGESTURE_INFERENCE_PREPROCESSING_VERIFIED",
            os.getenv("ECHOGESTURE_PREPROCESSING_VERIFIED", "false"),
        ).lower() == "true",
        rejection_threshold=threshold,
        google_translate_api_key=os.getenv("GOOGLE_TRANSLATE_API_KEY") or None,
        cors_origins=origins,
    )
