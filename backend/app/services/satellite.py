import asyncio
from datetime import date
from typing import Any

from fastapi import HTTPException, status

from app.schemas.prediction import PredictionRequest


class SatelliteService:
    sentinel_scale_meters = 1113.2

    def __init__(self) -> None:
        self._ee: Any | None = None
        self._initialized = False

    async def get_features(self, payload: PredictionRequest) -> dict[str, Any]:
        return await self.fetch_all(payload.latitude, payload.longitude, payload.date)

    async def ensure_initialized(self) -> None:
        await asyncio.to_thread(self._get_ee)

    async def fetch_all(
        self,
        latitude: float,
        longitude: float,
        target_date: date,
    ) -> dict[str, float | None]:
        await self.ensure_initialized()
        aod, no2, so2, co, o3, hcho = await asyncio.gather(
            self.fetch_aod(latitude, longitude, target_date),
            self.fetch_no2(latitude, longitude, target_date),
            self.fetch_so2(latitude, longitude, target_date),
            self.fetch_co(latitude, longitude, target_date),
            self.fetch_o3(latitude, longitude, target_date),
            self.fetch_hcho(latitude, longitude, target_date),
        )
        return {"AOD": aod, "NO2": no2, "SO2": so2, "CO": co, "O3": o3, "HCHO": hcho}

    async def fetch_aod(self, latitude: float, longitude: float, target_date: date) -> float | None:
        return await self._fetch_value(
            latitude=latitude,
            longitude=longitude,
            target_date=target_date,
            collection_name="MODIS/061/MCD19A2_GRANULES",
            band_name="Optical_Depth_055",
            scale=1000,
        )

    async def fetch_no2(self, latitude: float, longitude: float, target_date: date) -> float | None:
        return await self._fetch_value(
            latitude=latitude,
            longitude=longitude,
            target_date=target_date,
            collection_name="COPERNICUS/S5P/NRTI/L3_NO2",
            band_name="NO2_column_number_density",
        )

    async def fetch_so2(self, latitude: float, longitude: float, target_date: date) -> float | None:
        return await self._fetch_value(
            latitude=latitude,
            longitude=longitude,
            target_date=target_date,
            collection_name="COPERNICUS/S5P/NRTI/L3_SO2",
            band_name="SO2_column_number_density",
        )

    async def fetch_co(self, latitude: float, longitude: float, target_date: date) -> float | None:
        return await self._fetch_value(
            latitude=latitude,
            longitude=longitude,
            target_date=target_date,
            collection_name="COPERNICUS/S5P/NRTI/L3_CO",
            band_name="CO_column_number_density",
        )

    async def fetch_o3(self, latitude: float, longitude: float, target_date: date) -> float | None:
        return await self._fetch_value(
            latitude=latitude,
            longitude=longitude,
            target_date=target_date,
            collection_name="COPERNICUS/S5P/NRTI/L3_O3",
            band_name="O3_column_number_density",
        )

    async def fetch_hcho(self, latitude: float, longitude: float, target_date: date) -> float | None:
        return await self._fetch_value(
            latitude=latitude,
            longitude=longitude,
            target_date=target_date,
            collection_name="COPERNICUS/S5P/NRTI/L3_HCHO",
            band_name="tropospheric_HCHO_column_number_density",
        )

    async def _fetch_value(
        self,
        *,
        latitude: float,
        longitude: float,
        target_date: date,
        collection_name: str,
        band_name: str,
        scale: float | None = None,
    ) -> float | None:
        return await asyncio.to_thread(
            self._fetch_value_sync,
            latitude,
            longitude,
            target_date,
            collection_name,
            band_name,
            scale or self.sentinel_scale_meters,
        )

    def _fetch_value_sync(
        self,
        latitude: float,
        longitude: float,
        target_date: date,
        collection_name: str,
        band_name: str,
        scale: float,
    ) -> float | None:
        ee = self._get_ee()
        point = ee.Geometry.Point([longitude, latitude])
        start_date = ee.Date(target_date.isoformat())
        end_date = start_date.advance(1, "day")

        try:
            collection = (
                ee.ImageCollection(collection_name)
                .filterBounds(point)
                .filterDate(start_date, end_date)
                .select(band_name)
            )
            value = (
                collection.mean()
                .reduceRegion(
                    reducer=ee.Reducer.mean(),
                    geometry=point,
                    scale=scale,
                    bestEffort=True,
                    maxPixels=1_000_000,
                )
                .get(band_name)
                .getInfo()
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    "Google Earth Engine failed while fetching "
                    f"{band_name} from {collection_name}: {exc}"
                ),
            ) from exc

        return float(value) if value is not None else None

    def _get_ee(self) -> Any:
        if self._initialized and self._ee is not None:
            return self._ee

        try:
            import ee
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google Earth Engine SDK is not installed.",
            ) from exc

        try:
            ee.Initialize()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Google Earth Engine is not initialized. Run ee.Authenticate() first.",
            ) from exc

        self._ee = ee
        self._initialized = True
        return ee
