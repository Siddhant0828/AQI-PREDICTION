import asyncio
import math
from typing import Any

from app.schemas.geojson import (
    GeoJSONFeature,
    GeoJSONFeatureCollection,
    GeoJSONLineStringGeometry,
    GeoJSONPointGeometry,
)
from app.schemas.hcho import BoundingBoxQuery, HCHOObservation
from app.services.satellite import SatelliteService
from app.services.weather import WeatherService


class HCHOService:
    def __init__(
        self,
        *,
        satellite_service: SatelliteService | None = None,
        weather_service: WeatherService | None = None,
    ) -> None:
        self.satellite_service = satellite_service or SatelliteService()
        self.weather_service = weather_service or WeatherService()

    async def get_hotspots_geojson(self, query: BoundingBoxQuery) -> GeoJSONFeatureCollection:
        observations = await self.fetch_hcho_observations(query)
        # TODO: Replace raw observation features with DBSCAN cluster polygons/centroids.
        return GeoJSONFeatureCollection(
            features=[
                self._point_feature(
                    observation,
                    layer="hcho_hotspots",
                    dbscan_status="TODO",
                )
                for observation in observations
            ]
        )

    async def get_fires_geojson(self, query: BoundingBoxQuery) -> GeoJSONFeatureCollection:
        observations = await self.fetch_hcho_observations(query)
        # TODO: Add DBSCAN-based fire plume grouping and confidence scoring.
        return GeoJSONFeatureCollection(
            features=[
                self._point_feature(
                    observation,
                    layer="hcho_fire_indicators",
                    dbscan_status="TODO",
                )
                for observation in observations
            ]
        )

    async def get_transport_geojson(self, query: BoundingBoxQuery) -> GeoJSONFeatureCollection:
        observations, weather = await asyncio.gather(
            self.fetch_hcho_observations(query),
            self.weather_service.fetch_weather(query.center_latitude, query.center_longitude),
        )
        wind = weather.get("features", {})
        wind_speed = self._optional_float(wind.get("wind_speed"))
        wind_direction = self._optional_float(wind.get("wind_direction"))

        features: list[GeoJSONFeature] = [
            self._point_feature(
                observation,
                layer="hcho_transport_source",
                dbscan_status="TODO",
                wind_speed=wind_speed,
                wind_direction=wind_direction,
            )
            for observation in observations
        ]

        if wind_speed is not None and wind_direction is not None:
            center = HCHOObservation(
                latitude=query.center_latitude,
                longitude=query.center_longitude,
                hcho=None,
            )
            features.append(self._transport_line_feature(center, wind_speed, wind_direction))

        return GeoJSONFeatureCollection(features=features)

    async def fetch_hcho_observations(self, query: BoundingBoxQuery) -> list[HCHOObservation]:
        await self.satellite_service.ensure_initialized()
        points = self._grid_points(query)
        values = await asyncio.gather(
            *[
                self.satellite_service.fetch_hcho(latitude, longitude, query.date)
                for latitude, longitude in points
            ]
        )
        return [
            HCHOObservation(latitude=latitude, longitude=longitude, hcho=value)
            for (latitude, longitude), value in zip(points, values, strict=True)
        ]

    def _grid_points(self, query: BoundingBoxQuery) -> list[tuple[float, float]]:
        if query.grid_size == 1:
            return [(query.center_latitude, query.center_longitude)]

        lat_step = (query.max_lat - query.min_lat) / (query.grid_size - 1)
        lon_step = (query.max_lon - query.min_lon) / (query.grid_size - 1)
        return [
            (query.min_lat + lat_step * lat_index, query.min_lon + lon_step * lon_index)
            for lat_index in range(query.grid_size)
            for lon_index in range(query.grid_size)
        ]

    def _point_feature(
        self,
        observation: HCHOObservation,
        *,
        layer: str,
        dbscan_status: str,
        **extra_properties: Any,
    ) -> GeoJSONFeature:
        return GeoJSONFeature(
            geometry=GeoJSONPointGeometry(
                coordinates=(observation.longitude, observation.latitude),
            ),
            properties={
                "layer": layer,
                "HCHO": observation.hcho,
                "dbscan_status": dbscan_status,
                "source": "google_earth_engine",
                **extra_properties,
            },
        )

    def _transport_line_feature(
        self,
        center: HCHOObservation,
        wind_speed_kmh: float,
        wind_direction_degrees: float,
    ) -> GeoJSONFeature:
        downwind_bearing = (wind_direction_degrees + 180) % 360
        end_latitude, end_longitude = self._destination_point(
            latitude=center.latitude,
            longitude=center.longitude,
            bearing_degrees=downwind_bearing,
            distance_km=wind_speed_kmh,
        )
        return GeoJSONFeature(
            geometry=GeoJSONLineStringGeometry(
                coordinates=[
                    (center.longitude, center.latitude),
                    (end_longitude, end_latitude),
                ]
            ),
            properties={
                "layer": "hcho_transport_vector",
                "wind_speed": wind_speed_kmh,
                "wind_direction": wind_direction_degrees,
                "bearing": downwind_bearing,
                "source": "open_meteo",
            },
        )

    def _destination_point(
        self,
        *,
        latitude: float,
        longitude: float,
        bearing_degrees: float,
        distance_km: float,
    ) -> tuple[float, float]:
        radius_km = 6371.0088
        angular_distance = distance_km / radius_km
        bearing = math.radians(bearing_degrees)
        lat1 = math.radians(latitude)
        lon1 = math.radians(longitude)

        lat2 = math.asin(
            math.sin(lat1) * math.cos(angular_distance)
            + math.cos(lat1) * math.sin(angular_distance) * math.cos(bearing)
        )
        lon2 = lon1 + math.atan2(
            math.sin(bearing) * math.sin(angular_distance) * math.cos(lat1),
            math.cos(angular_distance) - math.sin(lat1) * math.sin(lat2),
        )
        return math.degrees(lat2), math.degrees(lon2)

    def _optional_float(self, value: Any) -> float | None:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None
