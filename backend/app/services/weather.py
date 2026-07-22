import asyncio
import time
from typing import Any

import requests
from fastapi import HTTPException, status

from app.config.settings import settings
from app.schemas.prediction import PredictionRequest


class WeatherService:
    base_url = "https://api.open-meteo.com/v1/forecast"

    async def get_features(self, payload: PredictionRequest) -> dict[str, Any]:
        return await self.fetch_weather(payload.latitude, payload.longitude)

    async def fetch_weather(self, latitude: float, longitude: float) -> dict[str, Any]:
        return await asyncio.to_thread(self._fetch_weather_sync, latitude, longitude)

    def _fetch_weather_sync(self, latitude: float, longitude: float) -> dict[str, Any]:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": ",".join(
                [
                    "temperature_2m",
                    "relative_humidity_2m",
                    "wind_speed_10m",
                    "wind_direction_10m",
                    "surface_pressure",
                    "precipitation",
                ]
            ),
        }

        last_error: Exception | None = None
        retry_count = max(1, settings.open_meteo_retry_count)
        for attempt in range(retry_count):
            try:
                response = requests.get(
                    self.base_url,
                    params=params,
                    timeout=settings.open_meteo_timeout_seconds,
                )
                response.raise_for_status()
                try:
                    payload = response.json()
                except ValueError as exc:
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Open-Meteo returned malformed JSON.",
                    ) from exc
                return self._format_response(payload)
            except requests.RequestException as exc:
                last_error = exc
                if attempt < retry_count - 1:
                    time.sleep(settings.open_meteo_retry_backoff_seconds * (attempt + 1))

        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Open-Meteo request failed after retries: {last_error}",
        )

    def _format_response(self, payload: dict[str, Any]) -> dict[str, Any]:
        current = payload.get("current")
        if not isinstance(current, dict):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Open-Meteo response did not include current weather data.",
            )

        surface_pressure_hpa = current.get("surface_pressure")
        surface_pressure_mmhg = (
            float(surface_pressure_hpa) * 0.750062 if surface_pressure_hpa is not None else None
        )

        features = {
            "temperature": self._to_float(current.get("temperature_2m")),
            "humidity": self._to_float(current.get("relative_humidity_2m")),
            "wind_speed": self._to_float(current.get("wind_speed_10m")),
            "wind_direction": self._to_float(current.get("wind_direction_10m")),
            "surface_pressure": surface_pressure_mmhg,
            "rainfall": self._to_float(current.get("precipitation")),
        }

        return {
            "source": "open_meteo",
            "time": current.get("time"),
            "temperature": {"value": features["temperature"], "unit": "celsius"},
            "humidity": {"value": features["humidity"], "unit": "percent"},
            "wind_speed": {"value": features["wind_speed"], "unit": "km/h"},
            "wind_direction": {"value": features["wind_direction"], "unit": "degrees"},
            "surface_pressure": {"value": features["surface_pressure"], "unit": "mmHg"},
            "rainfall": {"value": features["rainfall"], "unit": "mm"},
            "features": features,
        }

    def _to_float(self, value: Any) -> float | None:
        return float(value) if value is not None else None
