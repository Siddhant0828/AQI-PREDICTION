"""Application exception types."""


class AppError(Exception):
    """Base exception for application-specific errors."""


class ModelNotAvailableException(AppError):
    """Raised when trained prediction artifacts are not available."""

    def __init__(self, missing_files: list[str] | None = None) -> None:
        self.missing_files = missing_files or []
        message = "Prediction model artifacts are not available."
        if self.missing_files:
            message = f"{message} Missing files: {', '.join(self.missing_files)}"
        super().__init__(message)
