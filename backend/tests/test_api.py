from __future__ import annotations

import json


def test_health_reports_database_and_unavailable_services(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database": "connected",
        "recognition_model": "unavailable",
        "translation_service": "unavailable",
    }


def test_recognition_status_is_honest_without_model(client):
    response = client.get("/api/recognition/status")
    assert response.status_code == 200
    assert response.json()["available"] is False
    assert response.json()["reason"] == "model_not_configured"


def test_prediction_rejects_wrong_sequence_shape(client):
    response = client.post("/api/recognition/predict", json={"features": [[0.0] * 258 for _ in range(59)]})
    assert response.status_code == 422


def test_prediction_rejects_non_finite_features(client):
    features = [[0.0] * 258 for _ in range(60)]
    features[0][0] = float("nan")
    response = client.post(
        "/api/recognition/predict",
        content=json.dumps({"features": features}, allow_nan=True),
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 422
    assert "input" not in response.json()["detail"][0]


def test_valid_prediction_reports_model_unavailable(client):
    response = client.post("/api/recognition/predict", json={"features": [[0.0] * 258 for _ in range(60)]})
    assert response.status_code == 503
    detail = response.json()["detail"]
    assert detail["code"] == "recognition_unavailable"
    assert detail["reason"] == "model_not_configured"
    assert "sentence" not in detail


def test_settings_are_saved_in_sqlite(client):
    payload = {"settings": {"preferredLanguage": "Hindi", "speechRate": 1.1, "theme": "dark", "accent": "rose", "highContrast": True, "reducedMotion": False, "largerText": False, "largerControls": True, "voiceAssistance": False}}
    saved = client.put("/api/settings", json=payload)
    loaded = client.get("/api/settings")
    assert saved.status_code == 200
    assert loaded.json() == payload


def test_settings_validation_rejects_invalid_values(client):
    response = client.put("/api/settings", json={"settings": {"preferredLanguage": "Klingon"}})
    assert response.status_code == 422


def test_emergency_favorites_round_trip(client):
    phrase = {"phrase": "Please contact my family."}
    assert client.post("/api/history/favorites", json=phrase).status_code == 201
    assert phrase["phrase"] in client.get("/api/history/favorites").json()["items"]
    assert client.post("/api/history/favorites/remove", json=phrase).status_code == 200
    assert phrase["phrase"] not in client.get("/api/history/favorites").json()["items"]


def test_emergency_phrase_history_round_trip(client):
    phrase = {"phrase": "I need help."}
    assert client.post("/api/history/emergency-phrases", json=phrase).status_code == 201
    items = client.get("/api/history/emergency-phrases").json()["items"]
    assert items[0]["phrase"] == phrase["phrase"]


def test_translation_favorites_require_provider_history(client):
    item = {
        "source_text": "Hello",
        "source_language": "English",
        "target_language": "Hindi",
        "translated_text": "नमस्ते",
    }
    response = client.post("/api/history/translation-favorites", json=item)
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "translation_not_found"
    assert client.get("/api/history/translation-favorites").json()["items"] == []


def test_learning_progress_round_trip(client):
    payload = {"lesson_id": "demo-lesson", "completed": True, "quiz_score": 75}
    saved = client.put("/api/learning/progress", json=payload)
    assert saved.status_code == 200
    assert saved.json()["completed"] == 1
    assert client.get("/api/learning/progress").json()["items"][0]["lesson_id"] == "demo-lesson"


def test_translation_returns_unavailable_without_credentials(client):
    response = client.post("/api/translation", json={"text": "Hello", "source_language": "English", "target_language": "Hindi"})
    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "translation_not_configured"


def test_translation_validates_language_and_text(client):
    response = client.post("/api/translation", json={"text": "Hello", "source_language": "English", "target_language": "Klingon"})
    assert response.status_code == 422


def test_dataset_validator_reports_missing_local_drive_data(tmp_path):
    from app.training.dataset import validate_dataset

    report = validate_dataset(tmp_path / "manifests_77_v1", tmp_path / "full_keypoints")
    assert report.valid is False
    assert "does not exist" in report.errors[0]
