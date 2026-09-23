from datetime import date
from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    date: date
    location_name: str | None = None


class PredictionResult(BaseModel):
    pm25: float | None = None
    pm10: float | None = None
    no2: float | None = None
    so2: float | None = None
    co: float | None = None
    o3: float | None = None
    nh3: float | None = None
    aqi: float | None = None
    status: str

    # Groq IQAir Search AQI metadata
    is_groq_aqi: bool = False
    groq_aqi: float | None = None
    groq_source: str | None = None

    # Calibrated / Adjusted Model AQI (tuned for presentation display)
    adjusted_aqi: float | None = None
    adjusted_pm25: float | None = None
    adjusted_pm10: float | None = None

    # CPCB / OpenAQ Ground Station Data
    has_cpcb_station: bool = False
    cpcb_station_name: str | None = None
    cpcb_aqi: float | None = None
    cpcb_pm25: float | None = None
    cpcb_pm10: float | None = None
    cpcb_no2: float | None = None
    cpcb_so2: float | None = None
    cpcb_co: float | None = None
    cpcb_o3: float | None = None
    cpcb_nh3: float | None = None
    cpcb_distance_km: float | None = None

    # Official CPCB Indian NAQI Calculator Result
    cpcb_official_aqi: float | None = None
    cpcb_official_category: str | None = None
    cpcb_official_dominant_pollutant: str | None = None
    cpcb_official_sub_indices: dict[str, float] | None = None
    cpcb_official_details: dict | None = None


class PredictionResponse(PredictionResult):
    pass
