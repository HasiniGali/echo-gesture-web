from __future__ import annotations

from fastapi import APIRouter

from app.database import transaction
from app.schemas import LearningProgressInput

router = APIRouter(prefix="/learning", tags=["learning"])


@router.get("/lessons")
def list_lessons() -> dict[str, object]:
    return {
        "available": False,
        "items": [],
        "message": "Verified ISL lesson content has not been provided.",
    }


@router.get("/progress")
def get_progress() -> dict[str, list[dict[str, object]]]:
    with transaction() as connection:
        rows = connection.execute(
            "SELECT lesson_id, completed, quiz_score, updated_at FROM learning_progress ORDER BY updated_at DESC"
        ).fetchall()
    return {"items": [dict(row) for row in rows]}


@router.put("/progress")
def save_progress(payload: LearningProgressInput) -> dict[str, object]:
    with transaction() as connection:
        connection.execute(
            "INSERT INTO learning_progress (lesson_id, completed, quiz_score, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) "
            "ON CONFLICT(lesson_id) DO UPDATE SET completed = excluded.completed, quiz_score = excluded.quiz_score, updated_at = CURRENT_TIMESTAMP",
            (payload.lesson_id, int(payload.completed), payload.quiz_score),
        )
        row = connection.execute(
            "SELECT lesson_id, completed, quiz_score, updated_at FROM learning_progress WHERE lesson_id = ?",
            (payload.lesson_id,),
        ).fetchone()
    return dict(row)
