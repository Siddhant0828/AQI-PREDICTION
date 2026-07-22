from typing import Any


class FeatureService:
    feature_order = [
        "AOD",
        "NO2",
        "SO2",
        "CO",
        "O3",
        "HCHO",
        "Temperature",
        "Humidity",
        "Wind Speed",
        "Wind Direction",
    ]

    satellite_keys = {
        "AOD": ("AOD",),
        "NO2": ("NO2",),
        "SO2": ("SO2",),
        "CO": ("CO",),
        "O3": ("O3",),
        "HCHO": ("HCHO",),
    }
    weather_keys = {
        "Temperature": ("temperature", "Temperature", "temperature_2m"),
        "Humidity": ("humidity", "Humidity", "relative_humidity_2m"),
        "Wind Speed": ("wind_speed", "Wind Speed", "wind_speed_10m"),
        "Wind Direction": ("wind_direction", "Wind Direction", "wind_direction_10m"),
    }

    def build_model_feature_vector(
        self,
        *,
        satellite_features: dict[str, Any],
        weather_features: dict[str, Any],
    ) -> list[float]:
        normalized_satellite = self._extract_features(satellite_features)
        normalized_weather = self._extract_features(weather_features)

        return [
            self._normalize_value(self._get_first(normalized_satellite, self.satellite_keys["AOD"])),
            self._normalize_value(self._get_first(normalized_satellite, self.satellite_keys["NO2"])),
            self._normalize_value(self._get_first(normalized_satellite, self.satellite_keys["SO2"])),
            self._normalize_value(self._get_first(normalized_satellite, self.satellite_keys["CO"])),
            self._normalize_value(self._get_first(normalized_satellite, self.satellite_keys["O3"])),
            self._normalize_value(self._get_first(normalized_satellite, self.satellite_keys["HCHO"])),
            self._normalize_value(
                self._get_first(normalized_weather, self.weather_keys["Temperature"])
            ),
            self._normalize_value(self._get_first(normalized_weather, self.weather_keys["Humidity"])),
            self._normalize_value(
                self._get_first(normalized_weather, self.weather_keys["Wind Speed"])
            ),
            self._normalize_value(
                self._get_first(normalized_weather, self.weather_keys["Wind Direction"])
            ),
        ]

    def build_named_features(
        self,
        *,
        satellite_features: dict[str, Any],
        weather_features: dict[str, Any],
    ) -> dict[str, float]:
        vector = self.build_model_feature_vector(
            satellite_features=satellite_features,
            weather_features=weather_features,
        )
        return dict(zip(self.feature_order, vector, strict=True))

    def _extract_features(self, payload: dict[str, Any]) -> dict[str, Any]:
        features = payload.get("features")
        return features if isinstance(features, dict) else payload

    def _get_first(self, payload: dict[str, Any], keys: tuple[str, ...]) -> Any:
        for key in keys:
            value = payload.get(key)
            if isinstance(value, dict) and "value" in value:
                return value["value"]
            if value is not None:
                return value
        return None

    def _normalize_value(self, value: Any) -> float:
        if value is None:
            return 0.0
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0
