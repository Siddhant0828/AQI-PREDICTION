from datetime import date

from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    date: date


class PredictionResult(BaseModel):
    pm25: float | None
    pm10: float | None
    aqi: float | None
    status: str
    
    # CPCB Data
    has_cpcb_station: bool = False
    cpcb_station_name: str | None = None
    cpcb_aqi: float | None = None
    cpcb_pm25: float | None = None
    cpcb_pm10: float | None = None
    cpcb_distance_km: float | None = None


class PredictionResponse(PredictionResult):
    pass
