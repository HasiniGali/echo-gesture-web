from fastapi import APIRouter

from app.config import get_settings
from app.schemas import HealthResponse
from app.services.recognition_service import recognition_service

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = get_settings()
    model_available = bool(recognition_service.status()["available"])
    return HealthResponse(
        status="ok",
        database="connected",
        recognition_model="available" if model_available else "unavailable",
        translation_service="available" if settings.google_translate_api_key else "unavailable",
    )
