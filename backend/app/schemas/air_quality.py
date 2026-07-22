from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.air_quality import (
    AlertSeverity,
    AlertStatus,
    DatasetStatus,
    ModelStatus,
    PredictionStatus,
    ReportStatus,
)
from app.schemas.base import BaseSchema


class DatasetBase(BaseModel):
    name: str = Field(max_length=255)
    description: str | None = None
    source: str | None = Field(default=None, max_length=255)
    file_path: str | None = Field(default=None, max_length=500)
    status: DatasetStatus = DatasetStatus.PENDING
    row_count: int | None = None
    feature_columns: list[str] | None = None
    target_column: str | None = Field(default=None, max_length=255)
    uploaded_by_id: int | None = None


class DatasetCreate(DatasetBase):
    pass


class DatasetUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = None
    source: str | None = Field(default=None, max_length=255)
    file_path: str | None = Field(default=None, max_length=500)
    status: DatasetStatus | None = None
    row_count: int | None = None
    feature_columns: list[str] | None = None
    target_column: str | None = Field(default=None, max_length=255)
    uploaded_by_id: int | None = None


class DatasetRead(DatasetBase, BaseSchema):
    id: int
    created_at: datetime
    updated_at: datetime


class ModelMetadataBase(BaseModel):
    name: str = Field(max_length=255)
    version: str = Field(max_length=100)
    algorithm: str | None = Field(default=None, max_length=255)
    status: ModelStatus = ModelStatus.TRAINING
    metrics: dict[str, Any] | None = None
    parameters: dict[str, Any] | None = None
    artifact_path: str | None = Field(default=None, max_length=500)
    trained_at: datetime | None = None
    dataset_id: int | None = None
    created_by_id: int | None = None


class ModelMetadataCreate(ModelMetadataBase):
    pass


class ModelMetadataUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    version: str | None = Field(default=None, max_length=100)
    algorithm: str | None = Field(default=None, max_length=255)
    status: ModelStatus | None = None
    metrics: dict[str, Any] | None = None
    parameters: dict[str, Any] | None = None
    artifact_path: str | None = Field(default=None, max_length=500)
    trained_at: datetime | None = None
    dataset_id: int | None = None
    created_by_id: int | None = None


class ModelMetadataRead(ModelMetadataBase, BaseSchema):
    id: int
    created_at: datetime
    updated_at: datetime


class PredictionHistoryBase(BaseModel):
    location_name: str | None = Field(default=None, max_length=255)
    latitude: float | None = None
    longitude: float | None = None
    predicted_aqi: float | None = None
    prediction_date: datetime
    input_payload: dict[str, Any] | None = None
    output_payload: dict[str, Any] | None = None
    status: PredictionStatus = PredictionStatus.COMPLETED
    user_id: int | None = None
    dataset_id: int | None = None
    model_id: int | None = None


class PredictionHistoryCreate(PredictionHistoryBase):
    pass


class PredictionHistoryUpdate(BaseModel):
    location_name: str | None = Field(default=None, max_length=255)
    latitude: float | None = None
    longitude: float | None = None
    predicted_aqi: float | None = None
    prediction_date: datetime | None = None
    input_payload: dict[str, Any] | None = None
    output_payload: dict[str, Any] | None = None
    status: PredictionStatus | None = None
    user_id: int | None = None
    dataset_id: int | None = None
    model_id: int | None = None


class PredictionHistoryRead(PredictionHistoryBase, BaseSchema):
    id: int
    created_at: datetime
    updated_at: datetime


class HotspotBase(BaseModel):
    name: str = Field(max_length=255)
    description: str | None = None
    latitude: float
    longitude: float
    radius_km: float | None = None
    average_aqi: float | None = None
    max_aqi: float | None = None
    detected_at: datetime | None = None
    is_active: bool = True


class HotspotCreate(HotspotBase):
    pass


class HotspotUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=255)
    description: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_km: float | None = None
    average_aqi: float | None = None
    max_aqi: float | None = None
    detected_at: datetime | None = None
    is_active: bool | None = None


class HotspotRead(HotspotBase, BaseSchema):
    id: int
    created_at: datetime
    updated_at: datetime


class AlertBase(BaseModel):
    title: str = Field(max_length=255)
    message: str
    severity: AlertSeverity
    status: AlertStatus = AlertStatus.ACTIVE
    threshold_value: float | None = None
    observed_value: float | None = None
    triggered_at: datetime
    acknowledged_at: datetime | None = None
    resolved_at: datetime | None = None
    user_id: int | None = None
    hotspot_id: int | None = None
    prediction_id: int | None = None


class AlertCreate(AlertBase):
    pass


class AlertUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    message: str | None = None
    severity: AlertSeverity | None = None
    status: AlertStatus | None = None
    threshold_value: float | None = None
    observed_value: float | None = None
    triggered_at: datetime | None = None
    acknowledged_at: datetime | None = None
    resolved_at: datetime | None = None
    user_id: int | None = None
    hotspot_id: int | None = None
    prediction_id: int | None = None


class AlertRead(AlertBase, BaseSchema):
    id: int
    created_at: datetime
    updated_at: datetime


class ReportBase(BaseModel):
    title: str = Field(max_length=255)
    description: str | None = None
    status: ReportStatus = ReportStatus.DRAFT
    file_path: str | None = Field(default=None, max_length=500)
    report_date: date | None = None
    parameters: dict[str, Any] | None = None
    generated_by_id: int | None = None
    dataset_id: int | None = None
    prediction_id: int | None = None
    hotspot_id: int | None = None


class ReportCreate(ReportBase):
    pass


class ReportUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=255)
    description: str | None = None
    status: ReportStatus | None = None
    file_path: str | None = Field(default=None, max_length=500)
    report_date: date | None = None
    parameters: dict[str, Any] | None = None
    generated_by_id: int | None = None
    dataset_id: int | None = None
    prediction_id: int | None = None
    hotspot_id: int | None = None


class ReportRead(ReportBase, BaseSchema):
    id: int
    created_at: datetime
    updated_at: datetime
