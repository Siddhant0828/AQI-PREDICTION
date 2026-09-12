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
        "PM2.5",
        "PM10",
    ]

    def build_daily_feature_vector(
        self,
        satellite_day: dict[str, Any],
        weather_day: dict[str, Any],
    ) -> list[float]:
        """
        Builds a 10-feature single-day vector in exact model order:
        [AOD, S5P_NO2, S5P_SO2, S5P_CO, S5P_O3, Temperature, Humidity, Wind Speed, PM2.5, PM10]

        Converts units to match enhanced_feature_scaler training distribution:
        - AOD: Continuous optical depth (mean ~0.615). If passed in x1000 scale (>10), divided by 1000.
        - Wind Speed: In m/s. If passed in km/h (>10), divided by 3.6.
        - PM2.5 & PM10: In µg/m³ (means ~51.5 and ~111.1).
        """
        raw_aod = self._normalize_value(satellite_day.get("AOD"))
        if raw_aod > 10.0:
            aod = raw_aod / 1000.0
        elif raw_aod > 0.0:
            aod = raw_aod
        else:
            aod = 0.615

        no2 = self._normalize_value(satellite_day.get("S5P_NO2", satellite_day.get("NO2")))
        if no2 == 0.0:
            no2 = 6.07e-05

        so2 = self._normalize_value(satellite_day.get("S5P_SO2", satellite_day.get("SO2")))
        if so2 == 0.0:
            so2 = 1.42e-04

        co = self._normalize_value(satellite_day.get("S5P_CO", satellite_day.get("CO")))
        if co == 0.0:
            co = 0.0381

        o3 = self._normalize_value(satellite_day.get("S5P_O3", satellite_day.get("O3")))
        if o3 == 0.0:
            o3 = 0.1096

        temp = self._normalize_value(
            weather_day.get("Temperature", weather_day.get("temperature", weather_day.get("AT")))
        )
        if temp == 0.0:
            temp = 26.44

        hum = self._normalize_value(
            weather_day.get("Humidity", weather_day.get("humidity", weather_day.get("RH")))
        )
        if hum == 0.0:
            hum = 64.55

        raw_wind = self._normalize_value(
            weather_day.get("Wind Speed", weather_day.get("wind_speed", weather_day.get("WS")))
        )
        # If wind speed was reported in km/h (> 12.0), convert to m/s
        if raw_wind > 12.0:
            wind_ms = raw_wind / 3.6
        elif raw_wind > 0.0:
            wind_ms = raw_wind
        else:
            wind_ms = 1.67

        # Historical PM2.5 (in µg/m³)
        pm25 = self._normalize_value(
            satellite_day.get("PM2.5", satellite_day.get("pm25", satellite_day.get("pm2_5", weather_day.get("PM2.5"))))
        )
        if pm25 == 0.0:
            pm25 = 51.51

        # Historical PM10 (in µg/m³)
        pm10 = self._normalize_value(
            satellite_day.get("PM10", satellite_day.get("pm10", weather_day.get("PM10")))
        )
        if pm10 == 0.0:
            pm10 = 111.09

        return [aod, no2, so2, co, o3, temp, hum, wind_ms, pm25, pm10]

    def build_21day_matrix(
        self,
        satellite_21days: list[dict[str, Any]],
        weather_21days: list[dict[str, Any]],
    ) -> np.ndarray:
        """
        Builds a (21, 10) NumPy array from 21 days of satellite, weather, and historical PM features.
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
