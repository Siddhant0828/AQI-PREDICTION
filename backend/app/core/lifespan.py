from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI

from app.services.model_artifacts import ModelArtifactService

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    model_artifact_service = ModelArtifactService()
    model_artifact_service.load_once()
    logger.info("Prediction model artifacts loaded successfully.")
    app.state.model_artifact_service = model_artifact_service
    yield
