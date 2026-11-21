from __future__ import annotations

import json

from fastapi import APIRouter

from app.database import transaction
from app.schemas import AppPreferences, SettingsEnvelope

router = APIRouter(prefix="/settings", tags=["settings"])
DEFAULT_SETTINGS = AppPreferences().model_dump(mode="json")


@router.get("", response_model=SettingsEnvelope)
def get_preferences() -> SettingsEnvelope:
    with transaction() as connection:
        row = connection.execute("SELECT payload FROM app_settings WHERE id = 1").fetchone()
    if row is None:
        return SettingsEnvelope(settings=AppPreferences())
    try:
        return SettingsEnvelope(settings=AppPreferences.model_validate(json.loads(row["payload"])))
    except (ValueError, TypeError):
        return SettingsEnvelope(settings=AppPreferences())


@router.put("", response_model=SettingsEnvelope)
def save_preferences(payload: SettingsEnvelope) -> SettingsEnvelope:
    serialized = json.dumps(payload.settings.model_dump(mode="json"), ensure_ascii=False)
    with transaction() as connection:
        connection.execute(
            "INSERT INTO app_settings (id, payload, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP) "
            "ON CONFLICT(id) DO UPDATE SET payload = excluded.payload, updated_at = CURRENT_TIMESTAMP",
            (serialized,),
        )
    return payload
