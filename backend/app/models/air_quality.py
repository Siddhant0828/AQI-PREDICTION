from datetime import date, datetime
from enum import StrEnum
from typing import Any, Optional

from beanie import Document, Link
from pydantic import Field

from app.models.user import User


class DatasetStatus(StrEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class PredictionStatus(StrEnum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class ReportStatus(StrEnum):
    DRAFT = "draft"
    GENERATED = "generated"
    ARCHIVED = "archived"


class AlertSeverity(StrEnum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class AlertStatus(StrEnum):
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class ModelStatus(StrEnum):
    TRAINING = "training"
    ACTIVE = "active"
    DEPRECATED = "deprecated"
    FAILED = "failed"


class Dataset(Document):
    name: str = Field(index=True)
    description: Optional[str] = None
    source: Optional[str] = None
    file_path: Optional[str] = None
    status: DatasetStatus = DatasetStatus.PENDING
    row_count: Optional[int] = None
    feature_columns: Optional[list[str]] = None
    target_column: Optional[str] = None
    uploaded_by: Optional[Link[User]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "datasets"


class ModelMetadata(Document):
    name: str = Field(index=True)
    version: str = Field(index=True)
    algorithm: Optional[str] = None
    status: ModelStatus = ModelStatus.TRAINING
    metrics: Optional[dict[str, Any]] = None
    parameters: Optional[dict[str, Any]] = None
    artifact_path: Optional[str] = None
    trained_at: Optional[datetime] = None
    dataset: Optional[Link[Dataset]] = None
    created_by: Optional[Link[User]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "model_metadata"


class PredictionHistory(Document):
    location_name: Optional[str] = Field(default=None, index=True)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    predicted_aqi: Optional[float] = None
    prediction_date: datetime
    input_payload: Optional[dict[str, Any]] = None
    output_payload: Optional[dict[str, Any]] = None
    status: PredictionStatus = PredictionStatus.COMPLETED
    user: Optional[Link[User]] = None
    dataset: Optional[Link[Dataset]] = None
    model: Optional[Link[ModelMetadata]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "prediction_history"


class Hotspot(Document):
    name: str = Field(index=True)
    description: Optional[str] = None
    latitude: float
    longitude: float
    radius_km: Optional[float] = None
    average_aqi: Optional[float] = None
    max_aqi: Optional[float] = None
    detected_at: Optional[datetime] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "hotspots"


class Alert(Document):
    title: str
    message: str
    severity: AlertSeverity
    status: AlertStatus = AlertStatus.ACTIVE
    threshold_value: Optional[float] = None
    observed_value: Optional[float] = None
    triggered_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    user: Optional[Link[User]] = None
    hotspot: Optional[Link[Hotspot]] = None
    prediction: Optional[Link[PredictionHistory]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "alerts"


class Report(Document):
    title: str = Field(index=True)
    description: Optional[str] = None
    status: ReportStatus = ReportStatus.DRAFT
    file_path: Optional[str] = None
    report_date: Optional[date] = None
    parameters: Optional[dict[str, Any]] = None
    generated_by: Optional[Link[User]] = None
    dataset: Optional[Link[Dataset]] = None
    prediction: Optional[Link[PredictionHistory]] = None
    hotspot: Optional[Link[Hotspot]] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "reports"
