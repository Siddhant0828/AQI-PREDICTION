from typing import Any

from app.schemas.prediction import PredictionRequest
from app.services.features import FeatureService


class FeatureEngineeringService:
    def __init__(self) -> None:
        self.feature_service = FeatureService()

    def merge_features(
        self,
        *,
        payload: PredictionRequest,
        satellite_data: dict[str, Any],
        weather_data: dict[str, Any],
    ) -> dict[str, Any]:
        features: dict[str, Any] = {
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "year": payload.date.year,
            "month": payload.date.month,
            "day": payload.date.day,
        }

        features.update(
            self.feature_service.build_named_features(
                satellite_features=satellite_data,
                weather_features=weather_data,
            )
        )
        return features
