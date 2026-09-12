from app.services.features import FeatureService


def test_build_daily_feature_vector_orders_and_normalizes_values() -> None:
    service = FeatureService()

    vector = service.build_daily_feature_vector(
        satellite_day={
            "AOD": 0.4,
            "S5P_NO2": 0.0001,
            "S5P_SO2": 0.0002,
            "S5P_CO": 0.03,
            "S5P_O3": 0.12,
            "PM2.5": 42.0,
            "PM10": 85.0,
        },
        weather_day={
            "Temperature": 28.5,
            "Humidity": 60.0,
            "Wind Speed": 4.2,
        },
    )

    assert vector == [0.4, 0.0001, 0.0002, 0.03, 0.12, 28.5, 60.0, 4.2, 42.0, 85.0]


def test_build_21day_matrix_shape() -> None:
    service = FeatureService()

    sat_21 = [
        {
            "AOD": 0.4,
            "S5P_NO2": 0.0001,
            "S5P_SO2": 0.0002,
            "S5P_CO": 0.03,
            "S5P_O3": 0.12,
            "PM2.5": 45.0,
            "PM10": 90.0,
        }
        for _ in range(21)
    ]
    wea_21 = [
        {"Temperature": 25.0, "Humidity": 55.0, "Wind Speed": 5.0} for _ in range(21)
    ]

    matrix = service.build_21day_matrix(sat_21, wea_21)
    assert matrix.shape == (21, 10)
