from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.geojson import GeoJSONFeatureCollection
from app.schemas.hcho import BoundingBoxQuery
from app.services.hcho import HCHOService

router = APIRouter(tags=["hcho"])


def get_hcho_query(
    min_lat: float = Query(ge=-90, le=90),
    min_lon: float = Query(ge=-180, le=180),
    max_lat: float = Query(ge=-90, le=90),
    max_lon: float = Query(ge=-180, le=180),
    date_: date = Query(alias="date"),
    grid_size: int = Query(default=3, ge=1, le=10),
) -> BoundingBoxQuery:
    if min_lat > max_lat:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="min_lat must be less than or equal to max_lat.",
        )
    if min_lon > max_lon:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="min_lon must be less than or equal to max_lon.",
        )

    return BoundingBoxQuery(
        min_lat=min_lat,
        min_lon=min_lon,
        max_lat=max_lat,
        max_lon=max_lon,
        date=date_,
        grid_size=grid_size,
    )


@router.get("/hotspots", response_model=GeoJSONFeatureCollection, status_code=status.HTTP_200_OK)
async def get_hotspots(
    query: BoundingBoxQuery = Depends(get_hcho_query),
) -> GeoJSONFeatureCollection:
    return await HCHOService().get_hotspots_geojson(query)


@router.get("/fires", response_model=GeoJSONFeatureCollection, status_code=status.HTTP_200_OK)
async def get_fires(
    query: BoundingBoxQuery = Depends(get_hcho_query),
) -> GeoJSONFeatureCollection:
    return await HCHOService().get_fires_geojson(query)


@router.get("/transport", response_model=GeoJSONFeatureCollection, status_code=status.HTTP_200_OK)
async def get_transport(
    query: BoundingBoxQuery = Depends(get_hcho_query),
) -> GeoJSONFeatureCollection:
    return await HCHOService().get_transport_geojson(query)
