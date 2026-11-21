from __future__ import annotations

import httpx
from html import unescape
from fastapi import HTTPException

from app.config import get_settings

LANGUAGE_CODES = {"English": "en", "Hindi": "hi", "Telugu": "te", "Tamil": "ta", "Kannada": "kn"}
GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2"


async def translate(text: str, source_language: str, target_language: str) -> str:
    settings = get_settings()
    if not settings.google_translate_api_key:
        raise HTTPException(status_code=503, detail={"code": "translation_not_configured", "message": "Translation provider credentials are not configured."})
    payload = {
        "q": text,
        "source": LANGUAGE_CODES[source_language],
        "target": LANGUAGE_CODES[target_language],
        "format": "text",
    }
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.post(
                GOOGLE_TRANSLATE_URL,
                params={"key": settings.google_translate_api_key},
                json=payload,
            )
        response.raise_for_status()
        result = response.json()["data"]["translations"][0]["translatedText"]
        if not isinstance(result, str) or not result.strip():
            raise ValueError("empty provider response")
        return unescape(result)
    except httpx.TimeoutException as error:
        raise HTTPException(status_code=504, detail={"code": "translation_timeout", "message": "Translation provider timed out."}) from error
    except (httpx.HTTPError, KeyError, IndexError, ValueError) as error:
        raise HTTPException(status_code=502, detail={"code": "translation_provider_error", "message": "Translation provider could not complete the request."}) from error
