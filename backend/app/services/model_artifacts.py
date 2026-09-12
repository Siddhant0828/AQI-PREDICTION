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
        model_path: Path | None = None,
        scaler_x_path: Path | None = None,
        scaler_y_path: Path | None = None,
    ) -> None:
        # Default to enhanced CNN-BiLSTM model if present, fallback to cnn_lstm.keras
        if model_path is not None:
            self.model_path = model_path
        elif Path("models/enhanced_cnn_bilstm_best.keras").exists():
            self.model_path = Path("models/enhanced_cnn_bilstm_best.keras")
        else:
            self.model_path = Path("models/cnn_lstm.keras")

        # Check for enhanced_feature_scaler.pkl or fallbacks
        if scaler_x_path is not None:
            self.scaler_x_path = scaler_x_path
        elif Path("models/enhanced_feature_scaler.pkl").exists():
            self.scaler_x_path = Path("models/enhanced_feature_scaler.pkl")
        elif Path("models/feature_scaler.pkl").exists():
            self.scaler_x_path = Path("models/feature_scaler.pkl")
        else:
            self.scaler_x_path = Path("models/scaler_x.pkl")

        # Check for enhanced_target_scaler.pkl or fallbacks
        if scaler_y_path is not None:
            self.scaler_y_path = scaler_y_path
        elif Path("models/enhanced_target_scaler.pkl").exists():
            self.scaler_y_path = Path("models/enhanced_target_scaler.pkl")
        elif Path("models/target_scaler.pkl").exists():
            self.scaler_y_path = Path("models/target_scaler.pkl")
        else:
            self.scaler_y_path = Path("models/scaler_y.pkl")

        self._artifacts: ModelArtifacts | None = None

    @property
    def artifacts(self) -> ModelArtifacts:
        if self._artifacts is None:
            self.load_once()
        return self._artifacts

    def load_once(self) -> None:
        if self._artifacts is not None:
            return

        missing_files = self.missing_files()
        if missing_files:
            raise ModelNotAvailableException(missing_files)

        try:
            from tensorflow import keras
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Prediction dependencies are not installed.",
            ) from exc

        try:
            model = keras.models.load_model(self.model_path)
            scaler_x = self._load_scaler(self.scaler_x_path)
            scaler_y = self._load_scaler(self.scaler_y_path)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Prediction artifacts could not be loaded: {exc}",
            ) from exc

        self._artifacts = ModelArtifacts(model=model, scaler_x=scaler_x, scaler_y=scaler_y)

    def _load_scaler(self, path: Path) -> Any:
        try:
            import joblib
            return joblib.load(path)
        except Exception:
            import pickle
            with path.open("rb") as scaler_file:
                return pickle.load(scaler_file)

    def missing_files(self) -> list[str]:
        paths = [self.model_path, self.scaler_x_path, self.scaler_y_path]
        return [str(path) for path in paths if not path.exists()]
