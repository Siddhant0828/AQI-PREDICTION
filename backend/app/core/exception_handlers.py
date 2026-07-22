from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.core.exceptions import ModelNotAvailableException


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ModelNotAvailableException)
    async def model_not_available_handler(
        _request: Request,
        exc: ModelNotAvailableException,
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": "Prediction model is not available.",
                "missing_files": exc.missing_files,
            },
        )
