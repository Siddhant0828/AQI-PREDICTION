from fastapi import APIRouter

from app.api.v1.endpoints import aqi_map, auth, hcho, health, prediction, reports

router = APIRouter()
router.include_router(aqi_map.router)
router.include_router(auth.router)
router.include_router(hcho.router)
router.include_router(prediction.router)
router.include_router(reports.router)
router.include_router(health.router, tags=["health"])
