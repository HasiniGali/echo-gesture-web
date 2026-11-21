from __future__ import annotations

import json
import os
import sqlite3
import urllib.error
import urllib.request
import uuid
from typing import Any

from app.config import get_settings

BASE_URL = os.getenv("ECHOGESTURE_API_BASE_URL", "http://127.0.0.1:8001").rstrip("/")
QA_TOKEN = uuid.uuid4().hex[:12]
QA_PHRASE = f"EchoGesture integration QA {QA_TOKEN}"
QA_LESSON = f"integration-qa-{QA_TOKEN}"
RESULTS: list[dict[str, Any]] = []


def request(method: str, path: str, body: Any = None, headers: dict[str, str] | None = None) -> tuple[int, Any, Any]:
    request_headers = headers.copy() if headers else {}
    data = None
    if body is not None:
        data = json.dumps(body, allow_nan=False).encode("utf-8")
        request_headers["Content-Type"] = "application/json"

    def decode(raw: bytes) -> Any:
        if not raw:
            return None
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return raw.decode("utf-8", errors="replace")

    req = urllib.request.Request(f"{BASE_URL}{path}", data=data, method=method, headers=request_headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            raw = response.read()
            return response.status, decode(raw), response.headers
    except urllib.error.HTTPError as error:
        raw = error.read()
        return error.code, decode(raw), error.headers


def check(name: str, method: str, path: str, expected: int, body: Any = None) -> Any:
    status, payload, _ = request(method, path, body)
    passed = status == expected
    RESULTS.append({"name": name, "method": method, "path": path, "status": status, "expected": expected, "passed": passed})
    if not passed:
        raise AssertionError(f"{method} {path}: expected {expected}, received {status}: {payload}")
    return payload


def cleanup() -> None:
    settings = get_settings()
    if not settings.database_path.exists():
        return
    with sqlite3.connect(settings.database_path) as connection:
        connection.execute("DELETE FROM emergency_favorites WHERE phrase = ?", (QA_PHRASE,))
        connection.execute("DELETE FROM emergency_phrase_history WHERE phrase = ?", (QA_PHRASE,))
        connection.execute("DELETE FROM learning_progress WHERE lesson_id = ?", (QA_LESSON,))


def main() -> int:
    try:
        openapi = check("OpenAPI", "GET", "/openapi.json", 200)
        expected_paths = {
            "/api/health", "/api/recognition/status", "/api/recognition/predict", "/api/translation",
            "/api/settings", "/api/history/recognition", "/api/history/translations",
            "/api/history/favorites", "/api/history/favorites/remove",
            "/api/history/emergency-phrases", "/api/history/translation-favorites",
            "/api/history/translation-favorites/remove", "/api/learning/lessons", "/api/learning/progress",
        }
        missing_paths = expected_paths - set(openapi.get("paths", {}))
        if missing_paths:
            raise AssertionError(f"OpenAPI paths missing from live server: {sorted(missing_paths)}")

        check("Health + SQLite", "GET", "/api/health", 200)
        check("Recognition readiness", "GET", "/api/recognition/status", 200)
        check("Invalid sequence shape", "POST", "/api/recognition/predict", 422, {"features": [[0.0] * 258 for _ in range(59)]})
        check("No model yields unavailable", "POST", "/api/recognition/predict", 503, {"features": [[0.0] * 258 for _ in range(60)]})
        check("No translation key yields unavailable", "POST", "/api/translation", 503, {"text": "I need help.", "source_language": "English", "target_language": "Hindi"})

        saved_settings = check("Read settings", "GET", "/api/settings", 200)
        check("Persist settings", "PUT", "/api/settings", 200, saved_settings)
        check("Read recognition history", "GET", "/api/history/recognition", 200)
        check("Read translation history", "GET", "/api/history/translations", 200)

        check("Read emergency favorites", "GET", "/api/history/favorites", 200)
        check("Add emergency favorite", "POST", "/api/history/favorites", 201, {"phrase": QA_PHRASE})
        favorite_list = check("Verify emergency favorite", "GET", "/api/history/favorites", 200)
        if QA_PHRASE not in favorite_list["items"]:
            raise AssertionError("Emergency favorite was not persisted")
        check("Remove emergency favorite", "POST", "/api/history/favorites/remove", 200, {"phrase": QA_PHRASE})

        check("Read emergency recent history", "GET", "/api/history/emergency-phrases", 200)
        check("Record emergency phrase use", "POST", "/api/history/emergency-phrases", 201, {"phrase": QA_PHRASE})
        recent = check("Verify emergency phrase use", "GET", "/api/history/emergency-phrases", 200)
        if not any(item["phrase"] == QA_PHRASE for item in recent["items"]):
            raise AssertionError("Emergency phrase history was not persisted")

        check("Read translation favorites", "GET", "/api/history/translation-favorites", 200)
        fake_translation = {"source_text": "QA", "source_language": "English", "target_language": "Hindi", "translated_text": "Not a provider result"}
        check("Reject unverified translation favorite", "POST", "/api/history/translation-favorites", 404, fake_translation)
        check("Remove missing translation favorite", "POST", "/api/history/translation-favorites/remove", 200, fake_translation)

        lessons = check("Read verified learning content state", "GET", "/api/learning/lessons", 200)
        if lessons.get("available") is not False:
            raise AssertionError("Learning content must remain unavailable until verified material is supplied")
        check("Read learning progress", "GET", "/api/learning/progress", 200)
        check("Save learning progress", "PUT", "/api/learning/progress", 200, {"lesson_id": QA_LESSON, "completed": False, "quiz_score": None})
        progress = check("Verify learning progress", "GET", "/api/learning/progress", 200)
        if not any(item["lesson_id"] == QA_LESSON for item in progress["items"]):
            raise AssertionError("Learning progress was not persisted")

        cors_status, _, cors_headers = request(
            "OPTIONS",
            "/api/health",
            headers={"Origin": "http://127.0.0.1:5173", "Access-Control-Request-Method": "GET"},
        )
        cors_origin = cors_headers.get("Access-Control-Allow-Origin")
        RESULTS.append({"name": "CORS preflight", "method": "OPTIONS", "path": "/api/health", "status": cors_status, "allow_origin": cors_origin, "passed": cors_status == 200 and cors_origin == "http://127.0.0.1:5173"})
        if cors_status != 200 or cors_origin != "http://127.0.0.1:5173":
            raise AssertionError(f"CORS preflight failed: status={cors_status}, allow-origin={cors_origin}")
    finally:
        cleanup()

    print(json.dumps({"base_url": BASE_URL, "results": RESULTS, "passed": sum(item["passed"] for item in RESULTS), "total": len(RESULTS)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
