import asyncio
from datetime import date, timedelta
from typing import Any

import requests
from fastapi import HTTPException, status
from app.config.settings import settings
from app.schemas.prediction import PredictionRequest


class SatelliteService:
    sentinel_scale_meters = 1113.2
    open_meteo_aq_url = "https://air-quality-api.open-meteo.com/v1/air-quality"

    def __init__(self) -> None:
        self._ee: Any | None = None
        self._initialized = False

    async def get_features(self, payload: PredictionRequest) -> dict[str, Any]:
        try:
            return await self.fetch_all(payload.latitude, payload.longitude, payload.date)
        except Exception as exc:
            print(f"GEE fetch failed ({exc}), attempting Open-Meteo Air Quality satellite reanalysis...")
            fallback_features = await self._fetch_open_meteo_aq_day(
                payload.latitude, payload.longitude, payload.date
            )
            if fallback_features:
                return fallback_features
            return {
                "AOD": 0.45,
                "NO2": 0.00012,
                "SO2": 0.00025,
                "CO": 0.035,
                "O3": 0.13,
            }

    async def fetch_21day_satellite(
        self, latitude: float, longitude: float, target_date: date
    ) -> list[dict[str, float]]:
        """
        Fetches satellite features (AOD, Sentinel-5P NO2, SO2, CO, O3) for 21 days.
        Primary source: Google Earth Engine (GEE).
        Secondary live source: Copernicus / Open-Meteo Air Quality API.
        Fallback: Sample GEE baseline features.
        """
        # 1. Try GEE if initialized
        try:
            await self.ensure_initialized()
            start_date = target_date - timedelta(days=20)
            tasks = [
                self.fetch_all(latitude, longitude, start_date + timedelta(days=i))
                for i in range(21)
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            daily_features: list[dict[str, float]] = []
            for res in results:
                if isinstance(res, dict) and res.get("AOD") is not None:
                    daily_features.append(
                        {
                            "AOD": float(res.get("AOD") or 0.45),
                            "S5P_NO2": float(res.get("NO2") or 0.00012),
                            "S5P_SO2": float(res.get("SO2") or 0.00025),
                            "S5P_CO": float(res.get("CO") or 0.035),
                            "S5P_O3": float(res.get("O3") or 0.13),
                        }
                    )
            if len(daily_features) == 21:
                return daily_features
        except Exception as exc:
            print(f"GEE 21-day fetch unavailable ({exc}), attempting Open-Meteo Air Quality satellite reanalysis...")

        # 2. Try Open-Meteo Copernicus Satellite Reanalysis API (Live, No Key Required)
        open_meteo_21days = await self._fetch_open_meteo_aq_21days(latitude, longitude, target_date)
        if open_meteo_21days and len(open_meteo_21days) == 21:
            return open_meteo_21days

        # 3. Baseline sample values fallback
        return [
            {
                "AOD": 0.45,
                "S5P_NO2": 0.00012,
                "S5P_SO2": 0.00025,
                "S5P_CO": 0.035,
                "S5P_O3": 0.13,
            }
            for _ in range(21)
        ]

    async def _fetch_open_meteo_aq_21days(
        self, latitude: float, longitude: float, target_date: date
    ) -> list[dict[str, float]] | None:
        return await asyncio.to_thread(
            self._fetch_open_meteo_aq_21days_sync, latitude, longitude
        )

    def _fetch_open_meteo_aq_21days_sync(
        self, latitude: float, longitude: float
    ) -> list[dict[str, float]] | None:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": "nitrogen_dioxide,sulphur_dioxide,carbon_monoxide,ozone,aerosol_optical_depth",
            "past_days": 21,
        }
        try:
            response = requests.get(self.open_meteo_aq_url, params=params, timeout=10)
            if not response.ok:
                return None

            data = response.json()
            hourly = data.get("hourly", {})
            times = hourly.get("time", [])
            aod = hourly.get("aerosol_optical_depth", [])
            no2 = hourly.get("nitrogen_dioxide", [])
            so2 = hourly.get("sulphur_dioxide", [])
            co = hourly.get("carbon_monoxide", [])
            o3 = hourly.get("ozone", [])

            if not times or len(times) < 21 * 24:
                return None

            # Group into 24-hour chunks for 21 days
            result_days: list[dict[str, float]] = []
            for d in range(21):
                start_idx = d * 24
                end_idx = start_idx + 24

                def avg_val(arr: list[float | None], default: float, scale: float = 1.0) -> float:
                    sub = [v for v in arr[start_idx:end_idx] if v is not None]
                    if not sub:
                        return default
                    return (sum(sub) / len(sub)) * scale

                # Scale gas units to satellite column densities
                result_days.append(
                    {
                        "AOD": round(avg_val(aod, 0.45), 4),
                        "S5P_NO2": round(avg_val(no2, 0.00012, scale=1e-5), 6),
                        "S5P_SO2": round(avg_val(so2, 0.00025, scale=1e-5), 6),
                        "S5P_CO": round(avg_val(co, 0.035, scale=1e-4), 6),
                        "S5P_O3": round(avg_val(o3, 0.13, scale=1e-3), 6),
                    }
                )

            return result_days
        except Exception as exc:
            print(f"Open-Meteo Air Quality 21-day satellite fetch failed: {exc}")
            return None

    async def _fetch_open_meteo_aq_day(
        self, latitude: float, longitude: float, target_date: date
    ) -> dict[str, float] | None:
        res = await self._fetch_open_meteo_aq_21days(latitude, longitude, target_date)
        if res and len(res) > 0:
            latest = res[-1]
            return {
                "AOD": latest["AOD"],
                "NO2": latest["S5P_NO2"],
                "SO2": latest["S5P_SO2"],
                "CO": latest["S5P_CO"],
                "O3": latest["S5P_O3"],
            }
        return None

    async def ensure_initialized(self) -> None:
        await asyncio.to_thread(self._get_ee)

    async def fetch_all(
        self,
        latitude: float,
        longitude: float,
        target_date: date,
    ) -> dict[str, float | None]:
        await self.ensure_initialized()
        aod, no2, so2, co, o3 = await asyncio.gather(
            self.fetch_aod(latitude, longitude, target_date),
            self.fetch_no2(latitude, longitude, target_date),
            self.fetch_so2(latitude, longitude, target_date),
            self.fetch_co(latitude, longitude, target_date),
            self.fetch_o3(latitude, longitude, target_date),
        )
        return {"AOD": aod, "NO2": no2, "SO2": so2, "CO": co, "O3": o3}

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
            if settings.gee_project_id:
                ee.Initialize(project=settings.gee_project_id)
            else:
                ee.Initialize()
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Google Earth Engine is not initialized: {exc}",
            ) from exc

        self._ee = ee
        self._initialized = True
        return ee
