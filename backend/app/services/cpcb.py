import asyncio
import math
from typing import Any

import requests
from app.config.settings import settings


class CpcbService:
    base_url = "https://api.waqi.info/feed"

    async def get_real_time_aqi(
        self, latitude: float, longitude: float
    ) -> dict[str, Any]:
        """
        Fetches real-time CPCB ground station parameters from WAQI/CPCB feed.
        Converts ground station PM2.5 and PM10 to official Indian CPCB NAQI standard.
        """
        if not settings.waqi_api_token:
            return {"has_cpcb_station": False}

        return await asyncio.to_thread(self._fetch_waqi_sync, latitude, longitude)

    def _fetch_waqi_sync(self, latitude: float, longitude: float) -> dict[str, Any]:
        url = f"{self.base_url}/geo:{latitude};{longitude}/"
        params = {"token": settings.waqi_api_token}

        try:
            response = requests.get(url, params=params, timeout=10)
            if response.ok:
                data = response.json()
                if data.get("status") == "ok":
                    station_data = data.get("data", {})
                    city_data = station_data.get("city", {})
                    station_geo = city_data.get("geo", [])
                    
                    if len(station_geo) >= 2:
                        distance = self._haversine(latitude, longitude, station_geo[0], station_geo[1])
                        
                        if distance <= settings.cpcb_max_radius_km:
                            return self._build_cpcb_response(station_data, distance)

            # Fallback: Reverse geocode city name for search keyword lookup
            city_name = ""
            try:
                nom = requests.get(
                    f"https://nominatim.openstreetmap.org/reverse?format=json&lat={latitude}&lon={longitude}&zoom=10",
                    headers={"User-Agent": "AeroSense-CPCB/1.0"},
                    timeout=5,
                ).json()
                addr = nom.get("address", {})
                city_name = (
                    addr.get("city")
                    or addr.get("town")
                    or addr.get("county")
                    or addr.get("state_district")
                    or ""
                )
            except Exception:
                pass

            search_query = city_name if city_name else f"{latitude},{longitude}"
            search_url = "https://api.waqi.info/search/"
            search_params = {"keyword": search_query, "token": settings.waqi_api_token}
            s_res = requests.get(search_url, params=search_params, timeout=8)
            if s_res.ok:
                s_data = s_res.json()
                if s_data.get("status") == "ok":
                    best_uid = None
                    min_dist = float("inf")
                    for st in s_data.get("data", []):
                        s_geo = st.get("station", {}).get("geo", [])
                        if len(s_geo) >= 2:
                            d = self._haversine(latitude, longitude, s_geo[0], s_geo[1])
                            if d < min_dist and d <= settings.cpcb_max_radius_km:
                                min_dist = d
                                best_uid = st.get("uid")

                    if best_uid is not None:
                        feed_url = f"{self.base_url}/@{best_uid}/"
                        f_res = requests.get(feed_url, params=params, timeout=8)
                        if f_res.ok:
                            f_json = f_res.json()
                            if f_json.get("status") == "ok":
                                return self._build_cpcb_response(f_json.get("data", {}), min_dist)

            return {"has_cpcb_station": False}

        except Exception as exc:
            print(f"Failed to fetch CPCB data from WAQI: {exc}")
            return {"has_cpcb_station": False}

    def _safe_float(self, val: Any) -> float | None:
        if val is None or val == "-":
            return None
        try:
            return float(val)
        except (ValueError, TypeError):
            return None

    def _build_cpcb_response(self, station_data: dict[str, Any], distance: float) -> dict[str, Any]:
        city_data = station_data.get("city", {})
        iaqi = station_data.get("iaqi", {})
        
        pm25_val = self._safe_float(iaqi.get("pm25", {}).get("v")) if "pm25" in iaqi else None
        pm10_val = self._safe_float(iaqi.get("pm10", {}).get("v")) if "pm10" in iaqi else None
        
        # Calculate official Indian CPCB NAQI AQI using official sub-index formula
        cpcb_aqi = self.calculate_indian_cpcb_aqi(pm25_val, pm10_val)
        if cpcb_aqi is None and station_data.get("aqi"):
            cpcb_aqi = self._safe_float(station_data.get("aqi"))
        
        return {
            "has_cpcb_station": True,
            "cpcb_station_name": city_data.get("name"),
            "cpcb_aqi": round(cpcb_aqi) if cpcb_aqi is not None else None,
            "cpcb_pm25": pm25_val,
            "cpcb_pm10": pm10_val,
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
        a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
        c = 2 * math.asin(math.sqrt(a)) 
        r = 6371
        return c * r
