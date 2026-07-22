from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_prediction_service
from app.database.session import get_db
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.prediction import PredictionService, PredictionWorkflowService

router = APIRouter(tags=["prediction"])


@router.post("/predict", response_model=PredictionResponse, status_code=status.HTTP_200_OK)
async def predict(
    payload: PredictionRequest,
    session: AsyncSession = Depends(get_db),
    prediction_service: PredictionService = Depends(get_prediction_service),
) -> PredictionResponse:
    return await PredictionWorkflowService(session, prediction_service).predict(payload)
