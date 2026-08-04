from datetime import date
from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    date: date


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


class PredictionResponse(PredictionResult):
    pass
