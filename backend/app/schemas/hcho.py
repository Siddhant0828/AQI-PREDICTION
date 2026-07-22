from datetime import date

from pydantic import BaseModel, Field, model_validator


class BoundingBoxQuery(BaseModel):
    min_lat: float = Field(ge=-90, le=90)
    min_lon: float = Field(ge=-180, le=180)
    max_lat: float = Field(ge=-90, le=90)
    max_lon: float = Field(ge=-180, le=180)
    date: date
    grid_size: int = Field(default=3, ge=1, le=10)

    @model_validator(mode="after")
    def validate_bounds(self) -> "BoundingBoxQuery":
        if self.min_lat > self.max_lat:
            raise ValueError("min_lat must be less than or equal to max_lat.")
        if self.min_lon > self.max_lon:
            raise ValueError("min_lon must be less than or equal to max_lon.")
        return self

    @property
    def center_latitude(self) -> float:
        return (self.min_lat + self.max_lat) / 2

    @property
    def center_longitude(self) -> float:
        return (self.min_lon + self.max_lon) / 2


class HCHOObservation(BaseModel):
    latitude: float
    longitude: float
    hcho: float | None
