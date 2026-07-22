from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.air_quality import PredictionStatus
from app.repositories.air_quality import PredictionHistoryRepository
from app.schemas.air_quality import PredictionHistoryCreate
from app.schemas.prediction import PredictionRequest, PredictionResponse, PredictionResult
from app.services.features import FeatureService
from app.services.model_artifacts import ModelArtifactService
from app.services.satellite import SatelliteService
from app.services.weather import WeatherService


class PredictionService:
    def __init__(self, model_artifact_service: ModelArtifactService) -> None:
        self.model_artifact_service = model_artifact_service

    def predict(self, features: list[float]) -> PredictionResult:
        artifacts = self.model_artifact_service.artifacts
        try:
            import numpy as np

            scaled_features = artifacts.scaler_x.transform([features])
            raw_prediction = artifacts.model.predict(scaled_features, verbose=0)
            prediction_array = np.asarray(raw_prediction).reshape(1, -1)
            prediction = artifacts.scaler_y.inverse_transform(prediction_array)[0]
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Prediction dependencies are not installed.",
            ) from exc
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Prediction artifacts are incompatible with the generated features.",
            ) from exc

        return self._format_prediction(prediction)

    def _format_prediction(self, prediction: Any) -> PredictionResult:
        values = list(prediction)
        pm25 = self._value_at(values, 0)
        pm10 = self._value_at(values, 1)
        aqi = self._value_at(values, 2)

        return PredictionResult(pm25=pm25, pm10=pm10, aqi=aqi, status="Success")

    def _value_at(self, values: list[Any], index: int) -> float | None:
        if index >= len(values):
            return None
        return float(values[index])


class PredictionWorkflowService:
    def __init__(self, session: AsyncSession, prediction_service: PredictionService) -> None:
        self.session = session
        self.satellite_service = SatelliteService()
        self.weather_service = WeatherService()
        self.feature_service = FeatureService()
        self.prediction_service = prediction_service
        self.prediction_history_repository = PredictionHistoryRepository(session)

    async def predict(self, payload: PredictionRequest) -> PredictionResponse:
        satellite_data = await self.satellite_service.get_features(payload)
        weather_data = await self.weather_service.get_features(payload)
        feature_vector = self.feature_service.build_model_feature_vector(
            satellite_features=satellite_data,
            weather_features=weather_data,
        )
        named_features = self.feature_service.build_named_features(
            satellite_features=satellite_data,
            weather_features=weather_data,
        )
        prediction = self.prediction_service.predict(feature_vector)
        try:
            await self._save_prediction_history(
                payload=payload,
                features=named_features,
                feature_vector=feature_vector,
                satellite_data=satellite_data,
                weather_data=weather_data,
                prediction=prediction,
            )
            await self.session.commit()
        except SQLAlchemyError as exc:
            await self.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Prediction history could not be saved.",
            ) from exc

        return PredictionResponse(
            pm25=prediction.pm25,
            pm10=prediction.pm10,
            aqi=prediction.aqi,
            status=prediction.status,
        )

    async def _save_prediction_history(
        self,
        *,
        payload: PredictionRequest,
        features: dict[str, Any],
        feature_vector: list[float],
        satellite_data: dict[str, Any],
        weather_data: dict[str, Any],
        prediction: PredictionResult,
    ) -> Any:
        return await self.prediction_history_repository.create(
            PredictionHistoryCreate(
                latitude=payload.latitude,
                longitude=payload.longitude,
                predicted_aqi=prediction.aqi,
                prediction_date=datetime.combine(payload.date, datetime.min.time(), tzinfo=UTC),
                input_payload={
                    "request": payload.model_dump(mode="json"),
                    "satellite": satellite_data,
                    "weather": weather_data,
                    "features": features,
                    "feature_vector": feature_vector,
                },
                output_payload=prediction.model_dump(),
                status=(
                    PredictionStatus.COMPLETED
                    if prediction.status == "Success"
                    else PredictionStatus.FAILED
                ),
            )
        )
