from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("ECHOGESTURE_DATABASE_PATH", str(tmp_path / "test.sqlite3"))
    monkeypatch.delenv("GOOGLE_TRANSLATE_API_KEY", raising=False)
    monkeypatch.delenv("ECHOGESTURE_MODEL_PATH", raising=False)
    monkeypatch.delenv("ECHOGESTURE_VOCABULARY_PATH", raising=False)
    monkeypatch.setenv("ECHOGESTURE_INFERENCE_PREPROCESSING_VERIFIED", "false")
    with TestClient(app) as test_client:
        yield test_client
