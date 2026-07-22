from fastapi import APIRouter, status

from app.schemas.health import HealthCheck

router = APIRouter()


@router.get("/health", response_model=HealthCheck, status_code=status.HTTP_200_OK)
async def health_check() -> HealthCheck:
    return HealthCheck(status="ok")
