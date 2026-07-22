from dataclasses import dataclass
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from app.core.exceptions import ModelNotAvailableException


@dataclass(frozen=True)
class ModelArtifacts:
    model: Any
    scaler_x: Any
    scaler_y: Any


class ModelArtifactService:
    def __init__(
        self,
        *,
        model_path: Path = Path("models/cnn_lstm.keras"),
        scaler_x_path: Path = Path("models/scaler_x.pkl"),
        scaler_y_path: Path = Path("models/scaler_y.pkl"),
    ) -> None:
        self.model_path = model_path
        self.scaler_x_path = scaler_x_path
        self.scaler_y_path = scaler_y_path
        self._artifacts: ModelArtifacts | None = None

    @property
    def artifacts(self) -> ModelArtifacts:
        if self._artifacts is None:
            raise ModelNotAvailableException(self.missing_files())
        return self._artifacts

    def load_once(self) -> None:
        if self._artifacts is not None:
            return

        missing_files = self.missing_files()
        if missing_files:
            raise ModelNotAvailableException(missing_files)

        try:
            import pickle

            from tensorflow import keras
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Prediction dependencies are not installed.",
            ) from exc

        try:
            model = keras.models.load_model(self.model_path)
            with self.scaler_x_path.open("rb") as scaler_x_file:
                scaler_x = pickle.load(scaler_x_file)
            with self.scaler_y_path.open("rb") as scaler_y_file:
                scaler_y = pickle.load(scaler_y_file)
        except OSError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Prediction artifacts could not be loaded.",
            ) from exc

        self._artifacts = ModelArtifacts(model=model, scaler_x=scaler_x, scaler_y=scaler_y)

    def missing_files(self) -> list[str]:
        paths = [self.model_path, self.scaler_x_path, self.scaler_y_path]
        return [str(path) for path in paths if not path.exists()]
