from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.database import transaction
from app.schemas import FavoritePhrase, TranslationHistoryInput

router = APIRouter(prefix="/history", tags=["history"])


@router.get("/recognition")
def list_recognition_history(limit: int = Query(default=20, ge=1, le=100)) -> dict[str, list[dict[str, object]]]:
    with transaction() as connection:
        rows = connection.execute(
            "SELECT id, sentence, class_index, confidence, accepted, created_at FROM recognition_history ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return {"items": [dict(row) for row in rows]}


@router.get("/translations")
def list_translation_history(limit: int = Query(default=20, ge=1, le=100)) -> dict[str, list[dict[str, object]]]:
    with transaction() as connection:
        rows = connection.execute(
            "SELECT id, source_text, source_language, target_language, translated_text, created_at FROM translation_history ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return {"items": [dict(row) for row in rows]}


@router.get("/favorites")
def list_favorites() -> dict[str, list[str]]:
    with transaction() as connection:
        rows = connection.execute("SELECT phrase FROM emergency_favorites ORDER BY created_at DESC").fetchall()
    return {"items": [str(row["phrase"]) for row in rows]}


@router.post("/favorites", status_code=201)
def add_favorite(payload: FavoritePhrase) -> dict[str, str]:
    with transaction() as connection:
        connection.execute("INSERT OR IGNORE INTO emergency_favorites (phrase) VALUES (?)", (payload.phrase,))
    return {"phrase": payload.phrase}


@router.post("/favorites/remove")
def remove_favorite(payload: FavoritePhrase) -> dict[str, str]:
    with transaction() as connection:
        connection.execute("DELETE FROM emergency_favorites WHERE phrase = ?", (payload.phrase,))
    return {"phrase": payload.phrase}


@router.get("/emergency-phrases")
def list_emergency_phrase_history(limit: int = Query(default=10, ge=1, le=50)) -> dict[str, list[dict[str, object]]]:
    with transaction() as connection:
        rows = connection.execute(
            "SELECT id, phrase, used_at FROM emergency_phrase_history ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return {"items": [dict(row) for row in rows]}


@router.post("/emergency-phrases", status_code=201)
def add_emergency_phrase_history(payload: FavoritePhrase) -> dict[str, object]:
    with transaction() as connection:
        cursor = connection.execute("INSERT INTO emergency_phrase_history (phrase) VALUES (?)", (payload.phrase,))
        row = connection.execute(
            "SELECT id, phrase, used_at FROM emergency_phrase_history WHERE id = ?",
            (cursor.lastrowid,),
        ).fetchone()
    return dict(row)


@router.get("/translation-favorites")
def list_translation_favorites() -> dict[str, list[dict[str, object]]]:
    with transaction() as connection:
        rows = connection.execute(
            "SELECT source_text, source_language, target_language, translated_text, created_at FROM translation_favorites ORDER BY created_at DESC"
        ).fetchall()
    return {"items": [dict(row) for row in rows]}


@router.post("/translation-favorites", status_code=201)
def add_translation_favorite(payload: TranslationHistoryInput) -> dict[str, str]:
    with transaction() as connection:
        existing = connection.execute(
            "SELECT 1 FROM translation_history WHERE source_text = ? AND source_language = ? AND target_language = ? AND translated_text = ?",
            (payload.source_text, payload.source_language, payload.target_language, payload.translated_text),
        ).fetchone()
        if existing is None:
            raise HTTPException(status_code=404, detail={"code": "translation_not_found", "message": "Only provider-generated saved translations can be favorited."})
        connection.execute(
            "INSERT OR IGNORE INTO translation_favorites (source_text, source_language, target_language, translated_text) VALUES (?, ?, ?, ?)",
            (payload.source_text, payload.source_language, payload.target_language, payload.translated_text),
        )
    return {"translated_text": payload.translated_text}


@router.post("/translation-favorites/remove")
def remove_translation_favorite(payload: TranslationHistoryInput) -> dict[str, str]:
    with transaction() as connection:
        connection.execute(
            "DELETE FROM translation_favorites WHERE source_text = ? AND source_language = ? AND target_language = ? AND translated_text = ?",
            (payload.source_text, payload.source_language, payload.target_language, payload.translated_text),
        )
    return {"translated_text": payload.translated_text}
