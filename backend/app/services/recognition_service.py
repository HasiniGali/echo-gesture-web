from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.schemas import RecognitionResultResponse


class RecognitionUnavailable(RuntimeError):
    def __init__(self, reason: str) -> None:
        super().__init__(reason)
        self.reason = reason


class RecognitionService:
    def __init__(self) -> None:
        self._model: Any = None
        self._labels: list[str] | None = None
        self._torch: Any = None
        self._load_error: str | None = None

    def _read_labels(self, path: Path) -> list[str]:
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            labels = [str(item) for item in data]
        elif isinstance(data, dict):
            candidate = data.get("idx_to_sentence", data.get("class_to_sentence", data.get("classes", data.get("sentences"))))
            if candidate is None and isinstance(data.get("sentence_to_idx"), dict):
                sentence_to_idx = {str(sentence): int(index) for sentence, index in data["sentence_to_idx"].items()}
                candidate = {str(index): sentence for sentence, index in sentence_to_idx.items()}
            if isinstance(candidate, list):
                labels = [str(item) for item in candidate]
            elif isinstance(candidate, dict):
                indexed = {int(key): str(value) for key, value in candidate.items() if str(key).isdigit()}
                labels = [indexed[index] for index in range(len(indexed))]
            else:
                raise ValueError("unsupported vocabulary JSON structure")
        else:
            raise ValueError("vocabulary must be a JSON list or object")
        if len(labels) != 77 or len(set(labels)) != 77:
            raise ValueError("vocabulary must contain 77 unique sentence labels")
        return labels

    def _load(self) -> None:
        settings = get_settings()
        if settings.model_path is None or not settings.model_path.is_file():
            raise RecognitionUnavailable("model_not_configured")
        if settings.vocabulary_path is None or not settings.vocabulary_path.is_file():
            raise RecognitionUnavailable("vocabulary_not_configured")
        if not settings.inference_preprocessing_verified:
            raise RecognitionUnavailable("preprocessing_not_verified")
        if self._model is not None and self._labels is not None:
            return
        if self._load_error:
            raise RecognitionUnavailable(self._load_error)
        try:
            import torch

            labels = self._read_labels(settings.vocabulary_path)
            model = torch.jit.load(str(settings.model_path), map_location="cpu")
            model.eval()
            self._torch = torch
            self._labels = labels
            self._model = model
        except ImportError as error:
            self._load_error = "pytorch_not_installed"
            raise RecognitionUnavailable(self._load_error) from error
        except (OSError, RuntimeError, ValueError, json.JSONDecodeError) as error:
            self._load_error = "model_or_vocabulary_invalid"
            raise RecognitionUnavailable(self._load_error) from error

    def status(self) -> dict[str, object]:
        settings = get_settings()
        if settings.model_path is None or not settings.model_path.is_file():
            return {"available": False, "reason": "model_not_configured", "input_shape": [60, 258], "rejection_threshold": settings.rejection_threshold}
        if settings.vocabulary_path is None or not settings.vocabulary_path.is_file():
            return {"available": False, "reason": "vocabulary_not_configured", "input_shape": [60, 258], "rejection_threshold": settings.rejection_threshold}
        if not settings.inference_preprocessing_verified:
            return {"available": False, "reason": "preprocessing_not_verified", "input_shape": [60, 258], "rejection_threshold": settings.rejection_threshold}
        try:
            self._load()
        except RecognitionUnavailable as error:
            return {"available": False, "reason": error.reason, "input_shape": [60, 258], "rejection_threshold": settings.rejection_threshold}
        return {"available": True, "reason": None, "input_shape": [60, 258], "rejection_threshold": settings.rejection_threshold}

    def predict(self, features: list[list[float]]) -> RecognitionResultResponse:
        self._load()
        torch = self._torch
        tensor = torch.tensor(features, dtype=torch.float32).unsqueeze(0)
        try:
            with torch.inference_mode():
                output = self._model(tensor)
            if isinstance(output, (tuple, list)):
                output = output[0]
            if output.ndim != 2 or output.shape[0] != 1 or output.shape[1] != 77:
                raise RecognitionUnavailable("model_output_shape_invalid")
            probabilities = torch.softmax(output, dim=1)[0]
            confidence, class_index = torch.max(probabilities, dim=0)
            confidence_value = float(confidence.item())
            index_value = int(class_index.item())
        except RecognitionUnavailable:
            raise
        except Exception as error:
            raise RecognitionUnavailable("inference_failed") from error

        threshold = get_settings().rejection_threshold
        if confidence_value < threshold:
            return RecognitionResultResponse(
                status="rejected",
                confidence=confidence_value,
                rejection_reason="below_confidence_threshold",
            )
        return RecognitionResultResponse(
            status="accepted",
            sentence=self._labels[index_value],
            class_index=index_value,
            confidence=confidence_value,
        )


recognition_service = RecognitionService()
