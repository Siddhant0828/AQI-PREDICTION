import asyncio
import math
from typing import Any

import requests
from app.config.settings import settings


class CpcbService:
    waqi_base_url = "https://api.waqi.info/feed"
    openaq_base_url = "https://api.openaq.org/v3"

    async def get_real_time_aqi(
        self, latitude: float, longitude: float
    ) -> dict[str, Any]:
        """
        Fetches real-time ground station parameters from OpenAQ API v3 (CPCB/State PCB network)
        with WAQI API fallback. Calculates official Indian CPCB NAQI standard AQI.
        """
        return await asyncio.to_thread(self._fetch_ground_station_sync, latitude, longitude)

    def _fetch_ground_station_sync(self, latitude: float, longitude: float) -> dict[str, Any]:
        # 1. Try OpenAQ API v3
        openaq_result = self._fetch_openaq(latitude, longitude)
        if openaq_result and openaq_result.get("has_cpcb_station"):
            return openaq_result

        # 2. Fallback to WAQI CPCB feed
        return self._fetch_waqi_sync(latitude, longitude)

    def _fetch_openaq(self, latitude: float, longitude: float) -> dict[str, Any] | None:
        if not settings.openaq_api_key:
            return None

        headers = {"X-API-Key": settings.openaq_api_key}
        params = {
            "coordinates": f"{latitude},{longitude}",
            "radius": 25000,  # OpenAQ max radius: 25000 meters (25km)
            "limit": 20,
        }

        try:
            url = f"{self.openaq_base_url}/locations"
            response = requests.get(url, headers=headers, params=params, timeout=8)
            if not response.ok:
                return None

            data = response.json()
            results = data.get("results", []) if isinstance(data, dict) else []
            if not results:
                return None

            # Filter for ACTIVE monitoring stations (active in 2024, 2025, or 2026)
            active_results = [
                loc for loc in results
                if isinstance(loc, dict)
                and isinstance(loc.get("datetimeLast"), dict)
                and (loc["datetimeLast"].get("utc") or "") >= "2024-01-01"
            ]

            target_locations = active_results if active_results else results
            # Sort active locations by distance
            target_locations.sort(key=lambda l: float(l.get("distance", 999999)))

            best_loc = target_locations[0]
            loc_id = best_loc.get("id")
            station_name = best_loc.get("name") or "CPCB / State PCB Station"
            dist_meters = float(best_loc.get("distance", 0.0))
            dist_km = round(dist_meters / 1000.0, 2) if dist_meters else 0.0

            # Map sensor IDs to parameter names
            sensors = best_loc.get("sensors", []) if isinstance(best_loc.get("sensors"), list) else []
            sensor_map: dict[int, str] = {}
            for s in sensors:
                if isinstance(s, dict) and "id" in s:
                    p_name = s.get("parameter", {}).get("name") if isinstance(s.get("parameter"), dict) else None
                    if p_name:
                        sensor_map[s["id"]] = str(p_name).lower()

            # Fetch latest measurements
            latest_url = f"{self.openaq_base_url}/locations/{loc_id}/latest"
            l_res = requests.get(latest_url, headers=headers, timeout=8)
            if not l_res.ok:
                return None

            l_data = l_res.json()
            l_results = l_data.get("results", []) if isinstance(l_data, dict) else []

            measurements: dict[str, float] = {}
            for m in l_results:
                if isinstance(m, dict):
                    sid = m.get("sensorsId")
                    val = m.get("value")
                    if sid in sensor_map and val is not None:
                        param_name = sensor_map[sid]
                        float_val = float(val)
                        if float_val >= 0:
                            # Standardize Carbon Monoxide (CO) to mg/m3 if reported in ug/m3
                            if param_name == "co" and float_val > 50.0:
                                float_val = float_val / 1000.0
                            measurements[param_name] = float_val

            pm25_val = measurements.get("pm25", measurements.get("pm2.5"))
            pm10_val = measurements.get("pm10")
            no2_val = measurements.get("no2")
            so2_val = measurements.get("so2")
            co_val = measurements.get("co")
            o3_val = measurements.get("o3")
            nh3_val = measurements.get("nh3")

            cpcb_aqi = self.calculate_indian_cpcb_aqi(pm25_val, pm10_val)

            if cpcb_aqi is not None or pm25_val is not None or pm10_val is not None:
                return {
                    "has_cpcb_station": True,
                    "cpcb_station_name": station_name,
                    "cpcb_aqi": round(cpcb_aqi) if cpcb_aqi is not None else None,
                    "cpcb_pm25": round(pm25_val, 2) if pm25_val is not None else None,
                    "cpcb_pm10": round(pm10_val, 2) if pm10_val is not None else None,
                    "cpcb_no2": round(no2_val, 2) if no2_val is not None else None,
                    "cpcb_so2": round(so2_val, 2) if so2_val is not None else None,
                    "cpcb_co": round(co_val, 2) if co_val is not None else None,
                    "cpcb_o3": round(o3_val, 2) if o3_val is not None else None,
                    "cpcb_nh3": round(nh3_val, 2) if nh3_val is not None else None,
                    "cpcb_distance_km": dist_km,
                }
        except Exception as exc:
            print(f"OpenAQ API query failed: {exc}")

        return None

    def _fetch_waqi_sync(self, latitude: float, longitude: float) -> dict[str, Any]:
        tokens_to_try = []
        if settings.waqi_api_token:
            tokens_to_try.append(settings.waqi_api_token)
        tokens_to_try.append("demo")

        for token in tokens_to_try:
            url = f"{self.waqi_base_url}/geo:{latitude};{longitude}/"
            params = {"token": token}

            try:
                response = requests.get(url, params=params, timeout=8)
                if response.ok:
                    data = response.json()
                    if isinstance(data, dict) and data.get("status") == "ok":
                        station_data = data.get("data", {})
                        if isinstance(station_data, dict):
                            city_data = station_data.get("city", {})
                            station_geo = city_data.get("geo", []) if isinstance(city_data, dict) else []

                            distance = 0.0
                            if isinstance(station_geo, list) and len(station_geo) >= 2:
                                distance = self._haversine(
                                    latitude, longitude, station_geo[0], station_geo[1]
                                )

                            return self._build_cpcb_response(station_data, distance)

            except Exception as exc:
                print(f"WAQI token '{token}' geo fetch failed: {exc}")

        return {"has_cpcb_station": False}

    def _safe_float(self, val: Any) -> float | None:
        if val is None or val == "-":
            return None
        try:
            f = float(val)
            if f < 0:
                return None
            return f
        except (ValueError, TypeError):
            return None

    def _build_cpcb_response(self, station_data: dict[str, Any], distance: float) -> dict[str, Any]:
        city_data = station_data.get("city", {}) if isinstance(station_data.get("city"), dict) else {}
        iaqi = station_data.get("iaqi", {}) if isinstance(station_data.get("iaqi"), dict) else {}

        pm25_val = self._safe_float(iaqi.get("pm25", {}).get("v")) if "pm25" in iaqi and isinstance(iaqi.get("pm25"), dict) else None
        pm10_val = self._safe_float(iaqi.get("pm10", {}).get("v")) if "pm10" in iaqi and isinstance(iaqi.get("pm10"), dict) else None
        no2_val = self._safe_float(iaqi.get("no2", {}).get("v")) if "no2" in iaqi and isinstance(iaqi.get("no2"), dict) else None
        so2_val = self._safe_float(iaqi.get("so2", {}).get("v")) if "so2" in iaqi and isinstance(iaqi.get("so2"), dict) else None
        co_val = self._safe_float(iaqi.get("co", {}).get("v")) if "co" in iaqi and isinstance(iaqi.get("co"), dict) else None
        o3_val = self._safe_float(iaqi.get("o3", {}).get("v")) if "o3" in iaqi and isinstance(iaqi.get("o3"), dict) else None
        nh3_val = self._safe_float(iaqi.get("nh3", {}).get("v")) if "nh3" in iaqi and isinstance(iaqi.get("nh3"), dict) else None

        # CO in CPCB feed is often in mg/m3 or tenths of mg/m3; if > 50 convert to mg/m3
        if co_val is not None and co_val > 50.0:
            co_val = co_val / 1000.0

        cpcb_aqi = self.calculate_indian_cpcb_aqi(pm25_val, pm10_val)
        if cpcb_aqi is None and station_data.get("aqi"):
            cpcb_aqi = self._safe_float(station_data.get("aqi"))

        return {
            "has_cpcb_station": True,
            "cpcb_station_name": city_data.get("name") or "CPCB Station",
            "cpcb_aqi": round(cpcb_aqi) if cpcb_aqi is not None else None,
            "cpcb_pm25": round(pm25_val, 2) if pm25_val is not None else None,
            "cpcb_pm10": round(pm10_val, 2) if pm10_val is not None else None,
            "cpcb_no2": round(no2_val, 2) if no2_val is not None else None,
            "cpcb_so2": round(so2_val, 2) if so2_val is not None else None,
            "cpcb_co": round(co_val, 2) if co_val is not None else None,
            "cpcb_o3": round(o3_val, 2) if o3_val is not None else None,
            "cpcb_nh3": round(nh3_val, 2) if nh3_val is not None else None,
            "cpcb_distance_km": round(distance, 2),
        }

    def calculate_indian_cpcb_aqi(self, pm25: float | None, pm10: float | None) -> float | None:
        """
        Calculates official Indian CPCB National Air Quality Index (NAQI) sub-index
        for PM2.5 and PM10 according to Ministry of Environment & CPCB standard.
        """
        if pm25 is None and pm10 is None:
            return None

        def get_subindex(cp: float, breakpoints: list[tuple[float, float, float, float]]) -> float:
            for (c_low, c_high, i_low, i_high) in breakpoints:
                if c_low <= cp <= c_high:
                    return ((i_high - i_low) / (c_high - c_low)) * (cp - c_low) + i_low
            if cp > 500:
                return 500.0
            return 0.0

        pm25_bps = [
            (0.0, 30.0, 0, 50),
            (31.0, 60.0, 51, 100),
            (61.0, 90.0, 101, 200),
            (91.0, 120.0, 201, 300),
            (121.0, 250.0, 301, 400),
            (250.1, 5000.0, 401, 500),
        ]

        pm10_bps = [
            (0.0, 50.0, 0, 50),
            (51.0, 100.0, 51, 100),
            (101.0, 250.0, 101, 200),
            (251.0, 350.0, 201, 300),
            (351.0, 430.0, 301, 400),
            (430.1, 5000.0, 401, 500),
        ]

        i_pm25 = get_subindex(pm25, pm25_bps) if pm25 is not None else -1
        i_pm10 = get_subindex(pm10, pm10_bps) if pm10 is not None else -1

        valid_indices = [i for i in (i_pm25, i_pm10) if i >= 0]
        if not valid_indices:
            return None

        return max(valid_indices)

    def _haversine(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
        c = 2 * math.asin(math.sqrt(a))
        r = 6371
        return c * r
