from datetime import date
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.air_quality import PredictionHistory
from app.repositories.air_quality import PredictionHistoryRepository
from app.schemas.geojson import GeoJSONFeature, GeoJSONFeatureCollection, GeoJSONPointGeometry
from app.schemas.prediction import PredictionRequest, PredictionResponse
from app.services.prediction import PredictionService, PredictionWorkflowService


class AQIMapService:
    def __init__(self, session: AsyncSession, prediction_service: PredictionService) -> None:
        self.session = session
        self.prediction_service = prediction_service
        self.prediction_history_repository = PredictionHistoryRepository(session)

    async def get_geojson(
        self,
        *,
        latitude: float | None = None,
        longitude: float | None = None,
        target_date: date | None = None,
        limit: int = 500,
    ) -> GeoJSONFeatureCollection:
        history = await self.prediction_history_repository.list_for_aqi_map(limit=limit)
        if history:
            return GeoJSONFeatureCollection(
                features=[self._feature_from_history(record) for record in history]
            )

        has_any_prediction_param = latitude is not None or longitude is not None or target_date is not None
        has_all_prediction_params = latitude is not None and longitude is not None and target_date is not None

        if has_any_prediction_param and not has_all_prediction_params:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="latitude, longitude, and date are required for current prediction fallback.",
            )

        if not has_all_prediction_params:
            return GeoJSONFeatureCollection()

        payload = PredictionRequest(latitude=latitude, longitude=longitude, date=target_date)
        prediction = await PredictionWorkflowService(self.session, self.prediction_service).predict(
            payload
        )
        return GeoJSONFeatureCollection(
            features=[self._feature_from_prediction(payload=payload, prediction=prediction)]
        )

    def _feature_from_history(self, record: PredictionHistory) -> GeoJSONFeature:
        output_payload = record.output_payload if isinstance(record.output_payload, dict) else {}
        return GeoJSONFeature(
            geometry=GeoJSONPointGeometry(
                coordinates=(float(record.longitude), float(record.latitude)),
            ),
            properties={
                "id": record.id,
                "location_name": record.location_name,
                "prediction_date": record.prediction_date.isoformat(),
                "pm25": self._optional_float(output_payload.get("pm25")),
                "pm10": self._optional_float(output_payload.get("pm10")),
                "aqi": self._optional_float(output_payload.get("aqi") or record.predicted_aqi),
                "status": output_payload.get("status", record.status.value),
                "source": "prediction_history",
            },
        )

    def _feature_from_prediction(
        self,
        *,
        payload: PredictionRequest,
        prediction: PredictionResponse,
    ) -> GeoJSONFeature:
        return GeoJSONFeature(
            geometry=GeoJSONPointGeometry(
                coordinates=(payload.longitude, payload.latitude),
            ),
            properties={
                "prediction_date": payload.date.isoformat(),
                "pm25": prediction.pm25,
                "pm10": prediction.pm10,
                "aqi": prediction.aqi,
                "status": prediction.status,
                "source": "current_prediction",
            },
        )

    def _optional_float(self, value: Any) -> float | None:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None
