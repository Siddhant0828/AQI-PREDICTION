from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI

from app.services.model_artifacts import ModelArtifactService

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    from motor.motor_asyncio import AsyncIOMotorClient
    from beanie import init_beanie
    from app.config.settings import settings
    from app.models.user import User, RefreshToken
    from app.models.air_quality import Dataset, ModelMetadata, PredictionHistory, Hotspot, Alert, Report

    try:
        client = AsyncIOMotorClient(settings.mongodb_uri, serverSelectionTimeoutMS=2000)
        db = client[settings.mongodb_db_name]
        await init_beanie(database=db, document_models=[
            User, RefreshToken, Dataset, ModelMetadata, PredictionHistory, Hotspot, Alert, Report
        ])
        logger.info("MongoDB and Beanie initialized successfully.")
    except Exception as exc:
        logger.warning(f"MongoDB connection skipped or unavailable ({exc}). Proceeding with stateless prediction mode.")

    model_artifact_service = ModelArtifactService()
    try:
        model_artifact_service.load_once()
        logger.info("Prediction model artifacts loaded successfully.")
    except Exception as exc:
        logger.warning(f"Model artifacts pre-load deferred: {exc}")
    app.state.model_artifact_service = model_artifact_service
    yield
