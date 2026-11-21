from fastapi import APIRouter

from app.database import transaction
from app.schemas import TranslationRequest, TranslationResponse
from app.services.translation_service import translate

router = APIRouter(prefix="/translation", tags=["translation"])


@router.post("", response_model=TranslationResponse)
async def translate_text(payload: TranslationRequest) -> TranslationResponse:
    translated = await translate(payload.text, payload.source_language, payload.target_language)
    with transaction() as connection:
        connection.execute(
            "INSERT INTO translation_history (source_text, source_language, target_language, translated_text) VALUES (?, ?, ?, ?)",
            (payload.text, payload.source_language, payload.target_language, translated),
        )
    return TranslationResponse(
        text=translated,
        source_language=payload.source_language,
        target_language=payload.target_language,
        provider="google-cloud-translation",
    )
