"""
Official Indian Central Pollution Control Board (CPCB) National Air Quality Index (NAQI)
Calculation Module.

Implements the official CPCB breakpoint linear interpolation methodology for 8 pollutants:
PM2.5, PM10, NO2, SO2, CO, O3, NH3, Pb.
"""

from datetime import datetime, timezone
from typing import Any

# Official CPCB Breakpoint Tables: (Cp_low, Cp_high, I_low, I_high)
# Units:
# - PM2.5, PM10, NO2, SO2, O3, NH3, Pb: µg/m³
# - CO: mg/m³
CPCB_BREAKPOINTS: dict[str, list[tuple[float, float, float, float]]] = {
    "PM2.5": [
        (0.0, 30.0, 0.0, 50.0),
        (31.0, 60.0, 51.0, 100.0),
        (61.0, 90.0, 101.0, 200.0),
        (91.0, 120.0, 201.0, 300.0),
        (121.0, 250.0, 301.0, 400.0),
        (251.0, 5000.0, 401.0, 500.0),
    ],
    "PM10": [
        (0.0, 50.0, 0.0, 50.0),
        (51.0, 100.0, 51.0, 100.0),
        (101.0, 250.0, 101.0, 200.0),
        (251.0, 350.0, 201.0, 300.0),
        (351.0, 430.0, 301.0, 400.0),
        (431.0, 5000.0, 401.0, 500.0),
    ],
    "NO2": [
        (0.0, 40.0, 0.0, 50.0),
        (41.0, 80.0, 51.0, 100.0),
        (81.0, 180.0, 101.0, 200.0),
        (181.0, 280.0, 201.0, 300.0),
        (281.0, 400.0, 301.0, 400.0),
        (401.0, 5000.0, 401.0, 500.0),
    ],
    "SO2": [
        (0.0, 40.0, 0.0, 50.0),
        (41.0, 80.0, 51.0, 100.0),
        (81.0, 380.0, 101.0, 200.0),
        (381.0, 800.0, 201.0, 300.0),
        (801.0, 1600.0, 301.0, 400.0),
        (1601.0, 5000.0, 401.0, 500.0),
    ],
    "CO": [
        (0.0, 1.0, 0.0, 50.0),
        (1.1, 2.0, 51.0, 100.0),
        (2.1, 10.0, 101.0, 200.0),
        (10.1, 17.0, 201.0, 300.0),
        (17.1, 34.0, 301.0, 400.0),
        (34.1, 500.0, 401.0, 500.0),
    ],
    "O3": [
        (0.0, 50.0, 0.0, 50.0),
        (51.0, 100.0, 51.0, 100.0),
        (101.0, 168.0, 101.0, 200.0),
        (169.0, 208.0, 201.0, 300.0),
        (209.0, 748.0, 301.0, 400.0),
        (749.0, 5000.0, 401.0, 500.0),
    ],
    "NH3": [
        (0.0, 200.0, 0.0, 50.0),
        (201.0, 400.0, 51.0, 100.0),
        (401.0, 800.0, 101.0, 200.0),
        (801.0, 1200.0, 201.0, 300.0),
        (1201.0, 1800.0, 301.0, 400.0),
        (1801.0, 5000.0, 401.0, 500.0),
    ],
    "Pb": [
        (0.0, 0.5, 0.0, 50.0),
        (0.51, 1.0, 51.0, 100.0),
        (1.01, 2.0, 101.0, 200.0),
        (2.01, 3.0, 201.0, 300.0),
        (3.01, 3.5, 301.0, 400.0),
        (3.51, 500.0, 401.0, 500.0),
    ],
}


def get_cpcb_category(aqi_value: float) -> str:
    """Official CPCB Indian AQI Categories."""
    if aqi_value <= 50:
        return "Good"
    if aqi_value <= 100:
        return "Satisfactory"
    if aqi_value <= 200:
        return "Moderate"
    if aqi_value <= 300:
        return "Poor"
    if aqi_value <= 400:
        return "Very Poor"
    return "Severe"


def calculate_cpcb_subindex(pollutant_name: str, concentration: float | None) -> dict[str, Any] | None:
    """
    Calculates individual pollutant sub-index Ip using CPCB linear interpolation:
    Ip = ((IHI - ILO) / (BHI - BLO)) * (Cp - BLO) + ILO
    """
    if concentration is None or concentration < 0:
        return None

    norm_key = pollutant_name.upper().replace(" ", "").replace("_", "")
    canonical_map = {
        "PM25": "PM2.5",
        "PM2.5": "PM2.5",
        "PM10": "PM10",
        "NO2": "NO2",
        "SO2": "SO2",
        "CO": "CO",
        "O3": "O3",
        "NH3": "NH3",
        "PB": "Pb",
        "LEAD": "Pb",
    }
    p_key = canonical_map.get(norm_key, pollutant_name)

    breakpoints = CPCB_BREAKPOINTS.get(p_key)
    if not breakpoints:
        return None

    cp = float(concentration)

    for b_low, b_high, i_low, i_high in breakpoints:
        if b_low <= cp <= b_high:
            sub_index = ((i_high - i_low) / (b_high - b_low)) * (cp - b_low) + i_low
            rounded_sub = round(sub_index, 1)
            return {
                "pollutant": p_key,
                "concentration": cp,
                "sub_index": rounded_sub,
                "breakpoint": [b_low, b_high, i_low, i_high],
                "category": get_cpcb_category(rounded_sub),
            }

    # If concentration exceeds highest breakpoint
    max_b = breakpoints[-1]
    sub_index = 500.0
    return {
        "pollutant": p_key,
        "concentration": cp,
        "sub_index": sub_index,
        "breakpoint": list(max_b),
        "category": "Severe",
    }


def calculate_cpcb_official_aqi(pollutant_data: dict[str, float | None]) -> dict[str, Any]:
    """
    Calculates overall CPCB NAQI = max(sub_indices) and dominant pollutant.
    """
    sub_indices: dict[str, float] = {}
    breakdown: dict[str, Any] = {}

    for p_name, val in pollutant_data.items():
        res = calculate_cpcb_subindex(p_name, val)
        if res is not None:
            pkey = res["pollutant"]
            sub_indices[pkey] = res["sub_index"]
            breakdown[pkey] = res

    if not sub_indices:
        return {
            "aqi": None,
            "category": "Unknown",
            "dominantPollutant": None,
            "subIndices": {},
            "breakdown": {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "CPCB Indian NAQI Standard",
        }

    # CPCB overall AQI = max sub-index
    max_pollutant = max(sub_indices, key=lambda k: sub_indices[k])
    overall_aqi = round(sub_indices[max_pollutant], 1)
    category = get_cpcb_category(overall_aqi)

    return {
        "aqi": overall_aqi,
        "category": category,
        "dominantPollutant": max_pollutant,
        "subIndices": sub_indices,
        "breakdown": breakdown,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "source": "Official Central Pollution Control Board (CPCB) India NAQI",
    }
