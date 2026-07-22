from typing import Any, Literal

from pydantic import BaseModel, Field


class GeoJSONPointGeometry(BaseModel):
    type: Literal["Point"] = "Point"
    coordinates: tuple[float, float]


class GeoJSONLineStringGeometry(BaseModel):
    type: Literal["LineString"] = "LineString"
    coordinates: list[tuple[float, float]]


class GeoJSONFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: GeoJSONPointGeometry | GeoJSONLineStringGeometry
    properties: dict[str, Any] = Field(default_factory=dict)


class GeoJSONFeatureCollection(BaseModel):
    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[GeoJSONFeature] = Field(default_factory=list)
