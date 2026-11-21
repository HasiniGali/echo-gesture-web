from __future__ import annotations

import math
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

LANGUAGES = {"English", "Hindi", "Telugu", "Tamil", "Kannada"}


class HealthResponse(BaseModel):
    status: Literal["ok"]
    database: Literal["connected"]
    recognition_model: Literal["available", "unavailable"]
    translation_service: Literal["available", "unavailable"]


class RecognitionStatusResponse(BaseModel):
    available: bool
    reason: str | None = None
    input_shape: tuple[int, int] = (60, 258)
    rejection_threshold: float | None = None


class LandmarkSequence(BaseModel):
    features: list[list[float]]

    @field_validator("features")
    @classmethod
    def validate_sequence(cls, value: list[list[float]]) -> list[list[float]]:
        if len(value) != 60:
            raise ValueError("features must contain exactly 60 frames")
        for frame_index, frame in enumerate(value):
            if len(frame) != 258:
                raise ValueError(f"frame {frame_index} must contain exactly 258 values")
            if not all(math.isfinite(item) for item in frame):
                raise ValueError(f"frame {frame_index} contains a non-finite value")
        return value


class RecognitionResultResponse(BaseModel):
    status: Literal["accepted", "rejected"]
    sentence: str | None = None
    class_index: int | None = None
    confidence: float | None = None
    rejection_reason: str | None = None


class TranslationRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    source_language: str
    target_language: str

    @field_validator("text")
    @classmethod
    def validate_non_whitespace(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("text must contain non-whitespace characters")
        return value.strip()

    @field_validator("source_language", "target_language")
    @classmethod
    def validate_language(cls, value: str) -> str:
        if value not in LANGUAGES:
            raise ValueError(f"language must be one of: {', '.join(sorted(LANGUAGES))}")
        return value


class TranslationResponse(BaseModel):
    text: str
    source_language: str
    target_language: str
    provider: str


class AppPreferences(BaseModel):
    model_config = ConfigDict(extra="forbid")

    preferredLanguage: str = "English"
    speechRate: float = Field(default=1.0, ge=0.7, le=1.3)
    theme: Literal["light", "dark", "system"] = "light"
    accent: Literal["lavender", "rose", "blue", "mint", "peach"] = "lavender"
    highContrast: bool = False
    reducedMotion: bool = False
    largerText: bool = False
    largerControls: bool = False
    voiceAssistance: bool = False

    @field_validator("preferredLanguage")
    @classmethod
    def validate_preferred_language(cls, value: str) -> str:
        if value not in LANGUAGES:
            raise ValueError(f"preferredLanguage must be one of: {', '.join(sorted(LANGUAGES))}")
        return value


class SettingsEnvelope(BaseModel):
    settings: AppPreferences


class FavoritePhrase(BaseModel):
    phrase: str = Field(min_length=1, max_length=240)

    @field_validator("phrase")
    @classmethod
    def validate_phrase(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("phrase must contain non-whitespace characters")
        return value.strip()


class RecognitionHistoryInput(BaseModel):
    sentence: str = Field(min_length=1, max_length=500)
    class_index: int | None = Field(default=None, ge=0, lt=77)
    confidence: float | None = Field(default=None, ge=0, le=1)
    accepted: bool


class TranslationHistoryInput(BaseModel):
    source_text: str = Field(min_length=1, max_length=5000)
    source_language: str
    target_language: str
    translated_text: str = Field(min_length=1, max_length=5000)


class LearningProgressInput(BaseModel):
    lesson_id: str = Field(min_length=1, max_length=100)
    completed: bool
    quiz_score: float | None = Field(default=None, ge=0, le=100)
