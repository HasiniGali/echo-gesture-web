from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.api import health, history, learning, recognition, settings, translation
from app.config import get_settings
from app.database import initialize_database


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    initialize_database()
    yield


configuration = get_settings()
app = FastAPI(
    title="EchoGesture API",
    version="1.0.0",
    description="Backend services for the EchoGesture fixed-vocabulary ISL communication prototype.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(configuration.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

for route in (health.router, recognition.router, translation.router, settings.router, history.router, learning.router):
    app.include_router(route, prefix="/api")


@app.exception_handler(RequestValidationError)
async def request_validation_error_handler(_: Request, error: RequestValidationError) -> JSONResponse:
    safe_errors = [
        {"loc": issue.get("loc", []), "msg": issue.get("msg", "Invalid input"), "type": issue.get("type", "value_error")}
        for issue in error.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": safe_errors})


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {"name": "EchoGesture API", "docs": "/docs", "health": "/api/health"}
