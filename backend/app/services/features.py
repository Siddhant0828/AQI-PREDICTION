from typing import Any
import numpy as np


class FeatureService:
    feature_order = [
        "AOD",
        "S5P_NO2",
        "S5P_SO2",
        "S5P_CO",
        "S5P_O3",
        "Temperature",
        "Humidity",
        "Wind Speed",
    ]

    def build_daily_feature_vector(
        self,
        satellite_day: dict[str, Any],
        weather_day: dict[str, Any],
    ) -> list[float]:
        """
        Builds an 8-feature single-day vector in exact model order:
        [AOD, S5P_NO2, S5P_SO2, S5P_CO, S5P_O3, Temperature, Humidity, Wind Speed]

        Converts units to match scaler_x training distribution:
        - AOD: MODIS optical depth x1000 scale (mean ~418)
        - Wind Speed: converted from km/h to m/s (/3.6)
        """
        raw_aod = self._normalize_value(satellite_day.get("AOD"))
        aod = raw_aod * 1000.0 if (0.0 < raw_aod < 10.0) else (raw_aod if raw_aod >= 10.0 else 450.0)

        no2 = self._normalize_value(satellite_day.get("S5P_NO2", satellite_day.get("NO2")))
        if no2 == 0.0:
            no2 = 0.000064

        so2 = self._normalize_value(satellite_day.get("S5P_SO2", satellite_day.get("SO2")))
        if so2 == 0.0:
            so2 = 0.000225

        co = self._normalize_value(satellite_day.get("S5P_CO", satellite_day.get("CO")))
        if co == 0.0:
            co = 0.0396

        o3 = self._normalize_value(satellite_day.get("S5P_O3", satellite_day.get("O3")))
        if o3 == 0.0:
            o3 = 0.123

        temp = self._normalize_value(
            weather_day.get("Temperature", weather_day.get("temperature"))
        )
        if temp == 0.0:
            temp = 27.1

        hum = self._normalize_value(
            weather_day.get("Humidity", weather_day.get("humidity"))
        )
        if hum == 0.0:
            hum = 67.8

        raw_wind = self._normalize_value(
            weather_day.get("Wind Speed", weather_day.get("wind_speed"))
        )
        # Convert wind speed from km/h to m/s
        wind_ms = raw_wind / 3.6 if raw_wind > 0 else 1.04

        return [aod, no2, so2, co, o3, temp, hum, wind_ms]

    def build_21day_matrix(
        self,
        satellite_21days: list[dict[str, Any]],
        weather_21days: list[dict[str, Any]],
    ) -> np.ndarray:
        """
        Builds a (21, 8) NumPy array from 21 days of satellite and weather features.
        """
        matrix: list[list[float]] = []
        for i in range(21):
            sat = satellite_21days[i] if i < len(satellite_21days) else {}
            wea = weather_21days[i] if i < len(weather_21days) else {}
            row = self.build_daily_feature_vector(sat, wea)
            matrix.append(row)
        return np.array(matrix, dtype=np.float32)

    def _normalize_value(self, value: Any) -> float:
        if value is None:
            return 0.0
        try:
            val = float(value)
            return val if not np.isnan(val) else 0.0
        except (TypeError, ValueError):
            return 0.0
