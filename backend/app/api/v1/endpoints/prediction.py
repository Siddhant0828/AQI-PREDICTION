from fastapi import APIRouter, Depends, status

from app.api.dependencies import get_prediction_service
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.prediction import PredictionService, PredictionWorkflowService

router = APIRouter(tags=["prediction"])


@router.post("/predict", response_model=PredictionResponse, status_code=status.HTTP_200_OK)
async def predict(
    payload: PredictionRequest,
    prediction_service: PredictionService = Depends(get_prediction_service),
) -> PredictionResponse:
    return await PredictionWorkflowService(prediction_service).predict(payload)
