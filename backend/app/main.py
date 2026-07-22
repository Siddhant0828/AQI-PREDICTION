from fastapi import FastAPI

from app.api.router import api_router
from app.api.v1.endpoints.aqi_map import router as aqi_map_router
from app.api.v1.endpoints.hcho import router as hcho_router
from app.api.v1.endpoints.prediction import router as prediction_router
from app.api.v1.endpoints.reports import router as reports_router
from app.config.settings import settings
from app.core.exception_handlers import register_exception_handlers
from app.core.lifespan import lifespan
from app.core.logging import configure_logging
from app.middleware.cors import setup_cors


def create_app() -> FastAPI:
    configure_logging()

    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    register_exception_handlers(app)
    setup_cors(app)
    app.include_router(aqi_map_router)
    app.include_router(hcho_router)
    app.include_router(prediction_router)
    app.include_router(reports_router)
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    return app


app = create_app()
