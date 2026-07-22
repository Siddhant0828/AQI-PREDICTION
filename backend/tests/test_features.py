from app.services.features import FeatureService


def test_build_model_feature_vector_orders_and_normalizes_values() -> None:
    service = FeatureService()

    vector = service.build_model_feature_vector(
        satellite_features={
            "AOD": 0.1,
            "NO2": None,
            "SO2": "0.3",
            "CO": 0.4,
            "O3": 0.5,
            "HCHO": 0.6,
        },
        weather_features={
            "features": {
                "temperature": 31,
                "humidity": 45,
                "wind_speed": None,
                "wind_direction": 270,
            }
        },
    )

    assert vector == [0.1, 0.0, 0.3, 0.4, 0.5, 0.6, 31.0, 45.0, 0.0, 270.0]
