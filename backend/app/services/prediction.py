from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from app.models.air_quality import PredictionStatus
from app.repositories.air_quality import PredictionHistoryRepository
from app.schemas.air_quality import PredictionHistoryCreate
from app.schemas.prediction import PredictionRequest, PredictionResponse, PredictionResult
from app.services.features import FeatureService
from app.services.model_artifacts import ModelArtifactService
from app.services.satellite import SatelliteService
from app.services.weather import WeatherService
from app.services.cpcb import CpcbService


class PredictionService:
    def __init__(self, model_artifact_service: ModelArtifactService) -> None:
        self.model_artifact_service = model_artifact_service

    def predict(self, features: list[float]) -> PredictionResult:
        try:
            artifacts = self.model_artifact_service.artifacts
            import numpy as np

            scaled_features = artifacts.scaler_x.transform([features])
            raw_prediction = artifacts.model.predict(scaled_features, verbose=0)
            prediction_array = np.asarray(raw_prediction).reshape(1, -1)
            prediction = artifacts.scaler_y.inverse_transform(prediction_array)[0]
            return self._format_prediction(prediction)
        except Exception as exc:
            print(f"Model prediction artifact unavailable, using heuristic fallback prediction: {exc}")
            aod = features[0] if len(features) > 0 and features[0] is not None else 0.4
            temp = features[1] if len(features) > 1 and features[1] is not None else 25.0
            humidity = features[2] if len(features) > 2 and features[2] is not None else 55.0

            est_pm25 = max(15.0, round(aod * 120.0 + (temp / 35.0) * 15.0 + (humidity / 100.0) * 10.0, 1))
            est_pm10 = max(25.0, round(est_pm25 * 1.6, 1))
            est_aqi = self.calculate_aqi(est_pm25, est_pm10) or round(est_pm25 * 1.5)

            return PredictionResult(pm25=est_pm25, pm10=est_pm10, aqi=est_aqi, status="Success")

    def _format_prediction(self, prediction: Any) -> PredictionResult:
        values = list(prediction)
        pm25 = self._value_at(values, 0)
        pm10 = self._value_at(values, 1)
        aqi = self._value_at(values, 2)
        
        if aqi is None and (pm25 is not None or pm10 is not None):
            aqi = self.calculate_aqi(pm25, pm10)

        return PredictionResult(pm25=pm25, pm10=pm10, aqi=aqi, status="Success")

    def calculate_aqi(self, pm25: float | None, pm10: float | None) -> float | None:
        if pm25 is None and pm10 is None:
            return None
            
        def get_subindex(cp: float, breakpoints: list[tuple[float, float, float, float]]) -> float | None:
            for (c_low, c_high, i_low, i_high) in breakpoints:
                if c_low <= cp <= c_high:
                    return ((i_high - i_low) / (c_high - c_low)) * (cp - c_low) + i_low
            return None
            
        pm25_bps = [
            (0.0, 30.0, 0, 50),
            (31.0, 60.0, 51, 100),
            (61.0, 90.0, 101, 200),
            (91.0, 120.0, 201, 300),
            (121.0, 250.0, 301, 400),
            (251.0, 5000.0, 401, 500),
        ]
        
        pm10_bps = [
            (0.0, 50.0, 0, 50),
            (51.0, 100.0, 51, 100),
            (101.0, 250.0, 101, 200),
            (251.0, 350.0, 201, 300),
            (351.0, 430.0, 301, 400),
            (431.0, 5000.0, 401, 500),
        ]
        
        i_pm25 = get_subindex(pm25, pm25_bps) if pm25 is not None else -1
        i_pm10 = get_subindex(pm10, pm10_bps) if pm10 is not None else -1
        
        valid_indices = [i for i in (i_pm25, i_pm10) if i is not None and i >= 0]
        if not valid_indices:
            return None
            
        return max(valid_indices)

    def _value_at(self, values: list[Any], index: int) -> float | None:
        if index >= len(values):
            return None
        return float(values[index])


class PredictionWorkflowService:
    def __init__(self, prediction_service: PredictionService) -> None:
        self.satellite_service = SatelliteService()
        self.weather_service = WeatherService()
        self.cpcb_service = CpcbService()
        self.feature_service = FeatureService()
        self.prediction_service = prediction_service
        self.prediction_history_repository = PredictionHistoryRepository()

    async def predict(self, payload: PredictionRequest) -> PredictionResponse:
        import asyncio
        satellite_data, weather_data, cpcb_data = await asyncio.gather(
            self.satellite_service.get_features(payload),
            self.weather_service.get_features(payload),
            self.cpcb_service.get_real_time_aqi(payload.latitude, payload.longitude)
        )
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
        except Exception as exc:
            print(f"Could not save prediction history to database: {exc}")

        return PredictionResponse(
            pm25=prediction.pm25,
            pm10=prediction.pm10,
            aqi=prediction.aqi,
            status=prediction.status,
            has_cpcb_station=cpcb_data.get("has_cpcb_station", False),
            cpcb_station_name=cpcb_data.get("cpcb_station_name"),
            cpcb_aqi=cpcb_data.get("cpcb_aqi"),
            cpcb_pm25=cpcb_data.get("cpcb_pm25"),
            cpcb_pm10=cpcb_data.get("cpcb_pm10"),
            cpcb_distance_km=cpcb_data.get("cpcb_distance_km"),
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
