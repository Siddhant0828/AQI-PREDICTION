from datetime import date

from fastapi import APIRouter, Depends, Query, status

from app.api.dependencies import get_prediction_service
from app.schemas.geojson import GeoJSONFeatureCollection
from app.services.aqi_map import AQIMapService
from app.services.prediction import PredictionService

router = APIRouter(tags=["aqi-map"])


@router.get("/aqi-map", response_model=GeoJSONFeatureCollection, status_code=status.HTTP_200_OK)
async def get_aqi_map(
    latitude: float | None = Query(default=None, ge=-90, le=90),
    longitude: float | None = Query(default=None, ge=-180, le=180),
    date_: date | None = Query(default=None, alias="date"),
    limit: int = Query(default=500, ge=1, le=5000),
    prediction_service: PredictionService = Depends(get_prediction_service),
) -> GeoJSONFeatureCollection:
    return await AQIMapService(prediction_service).get_geojson(
        latitude=latitude,
        longitude=longitude,
        target_date=date_,
        limit=limit,
    )
