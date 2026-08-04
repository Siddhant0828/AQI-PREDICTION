import asyncio
from datetime import UTC, datetime
from typing import Any
import numpy as np

from fastapi import HTTPException, status

from app.models.air_quality import PredictionStatus
from app.repositories.air_quality import PredictionHistoryRepository
from app.schemas.air_quality import PredictionHistoryCreate
from app.schemas.prediction import PredictionRequest, PredictionResponse, PredictionResult
from app.services.cache import RedisCacheService
from app.services.cpcb import CpcbService
from app.services.features import FeatureService
from app.services.model_artifacts import ModelArtifactService
from app.services.satellite import SatelliteService
from app.services.weather import WeatherService


class PredictionService:
    def __init__(self, model_artifact_service: ModelArtifactService) -> None:
        self.model_artifact_service = model_artifact_service

    def predict(self, features_21x8: np.ndarray | list[list[float]]) -> PredictionResult:
        """
        Passes a (21, 8) NumPy array representing 21 days of 8 features:
        [AOD, S5P_NO2, S5P_SO2, S5P_CO, S5P_O3, Temperature, Humidity, Wind Speed]
        
        1. Scales features with feature_scaler.pkl (scaler_x)
        2. Reshapes to (1, 21, 8) for batch inference
        3. Calls cnn_lstm.keras model.predict(...)
        4. Descales output with target_scaler.pkl (scaler_y)
        5. Computes Indian CPCB NAQI AQI for PM2.5 and PM10
        """
        try:
            artifacts = self.model_artifact_service.artifacts
            matrix = np.asarray(features_21x8, dtype=np.float32)
            if matrix.shape != (21, 8):
                matrix = matrix.reshape((21, 8))

            # 1. Scale 21 rows of 8 features
            scaled_features = artifacts.scaler_x.transform(matrix)
            # 2. Reshape to (1, 21, 8) input batch for CNN-LSTM
            input_tensor = scaled_features.reshape(1, 21, 8)
            # 3. Model predict -> (1, 2)
            raw_prediction = artifacts.model.predict(input_tensor, verbose=0)
            prediction_array = np.asarray(raw_prediction).reshape(1, -1)
            # 4. Descale output -> [[pm25, pm10]]
            unscaled = artifacts.scaler_y.inverse_transform(prediction_array)[0]

            pm25 = max(0.0, round(float(unscaled[0]), 2))
            pm10 = max(0.0, round(float(unscaled[1]), 2))

            # 5. Calculate official Indian CPCB AQI
            aqi = self.calculate_indian_cpcb_aqi(pm25, pm10)

            return PredictionResult(
                pm25=pm25,
                pm10=pm10,
                aqi=aqi,
                status="Success",
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Model prediction failed: {exc}",
            ) from exc

    def calculate_indian_cpcb_aqi(self, pm25: float | None, pm10: float | None) -> float | None:
        """
        Calculates official Indian CPCB National Air Quality Index (NAQI)
        sub-index for PM2.5 and PM10 based on standard breakpoint tables.
        """
        if pm25 is None and pm10 is None:
            return None

        def get_subindex(cp: float, breakpoints: list[tuple[float, float, float, float]]) -> float:
            for c_low, c_high, i_low, i_high in breakpoints:
                if c_low <= cp <= c_high:
                    return ((i_high - i_low) / (c_high - c_low)) * (cp - c_low) + i_low
            if cp > 500:
                return 500.0
            return 0.0

        pm25_bps = [
            (0.0, 30.0, 0.0, 50.0),
            (31.0, 60.0, 51.0, 100.0),
            (61.0, 90.0, 101.0, 200.0),
            (91.0, 120.0, 201.0, 300.0),
            (121.0, 250.0, 301.0, 400.0),
            (251.0, 5000.0, 401.0, 500.0),
        ]

        pm10_bps = [
            (0.0, 50.0, 0.0, 50.0),
            (51.0, 100.0, 51.0, 100.0),
            (101.0, 250.0, 101.0, 200.0),
            (251.0, 350.0, 201.0, 300.0),
            (351.0, 430.0, 301.0, 400.0),
            (431.0, 5000.0, 401.0, 500.0),
        ]

        i_pm25 = get_subindex(pm25, pm25_bps) if pm25 is not None else -1.0
        i_pm10 = get_subindex(pm10, pm10_bps) if pm10 is not None else -1.0

        valid_indices = [i for i in (i_pm25, i_pm10) if i >= 0]
        if not valid_indices:
            return None

        return round(max(valid_indices), 2)


class PredictionWorkflowService:
    def __init__(self, prediction_service: PredictionService) -> None:
        self.satellite_service = SatelliteService()
        self.weather_service = WeatherService()
        self.cpcb_service = CpcbService()
        self.feature_service = FeatureService()
        self.cache_service = RedisCacheService()
        self.prediction_service = prediction_service
        self.prediction_history_repository = PredictionHistoryRepository()

    async def predict(self, payload: PredictionRequest) -> PredictionResponse:
        cache_key = (
            f"aqi:seq:{payload.latitude:.4f}:{payload.longitude:.4f}:{payload.date.isoformat()}"
        )

        # 1. Check Redis cache first
        cached_matrix = await self.cache_service.get_cached_sequence(cache_key)

        if cached_matrix is not None and len(cached_matrix) == 21:
            matrix_21x8 = np.array(cached_matrix, dtype=np.float32)
            cpcb_data = await self.cpcb_service.get_real_time_aqi(
                payload.latitude, payload.longitude
            )
        else:
            # 2. Fetch 21 days of satellite & weather features concurrently
            sat_21days, wea_21days, cpcb_data = await asyncio.gather(
                self.satellite_service.fetch_21day_satellite(
                    payload.latitude, payload.longitude, payload.date
                ),
                self.weather_service.fetch_21day_weather(
                    payload.latitude, payload.longitude, payload.date
                ),
                self.cpcb_service.get_real_time_aqi(
                    payload.latitude, payload.longitude
                ),
            )

            # 3. Build (21, 8) NumPy matrix
            matrix_21x8 = self.feature_service.build_21day_matrix(sat_21days, wea_21days)

            # 4. Cache sequence in Redis for fast access
            await self.cache_service.set_cached_sequence(cache_key, matrix_21x8.tolist())

        # 5. Execute model prediction
        prediction = self.prediction_service.predict(matrix_21x8)

        # 6. Save history asynchronously
        try:
            await self._save_prediction_history(
                payload=payload,
                matrix_21x8=matrix_21x8,
                prediction=prediction,
            )
        except Exception as exc:
            print(f"Could not save prediction history to database: {exc}")

        return PredictionResponse(
            pm25=prediction.pm25,
            pm10=prediction.pm10,
            no2=cpcb_data.get("cpcb_no2"),
            so2=cpcb_data.get("cpcb_so2"),
            co=cpcb_data.get("cpcb_co"),
            o3=cpcb_data.get("cpcb_o3"),
            nh3=cpcb_data.get("cpcb_nh3"),
            aqi=prediction.aqi,
            status=prediction.status,
            has_cpcb_station=cpcb_data.get("has_cpcb_station", False),
            cpcb_station_name=cpcb_data.get("cpcb_station_name"),
            cpcb_aqi=cpcb_data.get("cpcb_aqi"),
            cpcb_pm25=cpcb_data.get("cpcb_pm25"),
            cpcb_pm10=cpcb_data.get("cpcb_pm10"),
            cpcb_no2=cpcb_data.get("cpcb_no2"),
            cpcb_so2=cpcb_data.get("cpcb_so2"),
            cpcb_co=cpcb_data.get("cpcb_co"),
            cpcb_o3=cpcb_data.get("cpcb_o3"),
            cpcb_nh3=cpcb_data.get("cpcb_nh3"),
            cpcb_distance_km=cpcb_data.get("cpcb_distance_km"),
        )

    async def _save_prediction_history(
        self,
        *,
        payload: PredictionRequest,
        matrix_21x8: np.ndarray,
        prediction: PredictionResult,
    ) -> Any:
        return await self.prediction_history_repository.create(
            PredictionHistoryCreate(
                latitude=payload.latitude,
                longitude=payload.longitude,
                predicted_aqi=prediction.aqi,
                prediction_date=datetime.combine(
                    payload.date, datetime.min.time(), tzinfo=UTC
                ),
                input_payload={
                    "request": payload.model_dump(mode="json"),
                    "matrix_shape": list(matrix_21x8.shape),
                },
                output_payload=prediction.model_dump(),
                status=(
                    PredictionStatus.COMPLETED
                    if prediction.status == "Success"
                    else PredictionStatus.FAILED
                ),
            )
        )
