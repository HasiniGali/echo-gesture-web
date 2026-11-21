from fastapi import APIRouter, HTTPException

from app.database import transaction
from app.schemas import LandmarkSequence, RecognitionResultResponse, RecognitionStatusResponse
from app.services.recognition_service import RecognitionUnavailable, recognition_service

router = APIRouter(prefix="/recognition", tags=["recognition"])


@router.get("/status", response_model=RecognitionStatusResponse)
def recognition_status() -> RecognitionStatusResponse:
    return RecognitionStatusResponse(**recognition_service.status())


@router.post("/predict", response_model=RecognitionResultResponse)
def predict(payload: LandmarkSequence) -> RecognitionResultResponse:
    try:
        result = recognition_service.predict(payload.features)
        if result.status == "accepted" and result.sentence is not None and result.class_index is not None and result.confidence is not None:
            with transaction() as connection:
                connection.execute(
                    "INSERT INTO recognition_history (sentence, class_index, confidence, accepted) VALUES (?, ?, ?, 1)",
                    (result.sentence, result.class_index, result.confidence),
                )
        return result
    except RecognitionUnavailable as error:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "recognition_unavailable",
                "message": "Recognition is not ready. No prediction was produced.",
                "reason": error.reason,
            },
        ) from error
