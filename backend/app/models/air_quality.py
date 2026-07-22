from datetime import date, datetime
from enum import StrEnum
from typing import TYPE_CHECKING, Any

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.user import User


def enum_values(enum: type[StrEnum]) -> list[str]:
    return [item.value for item in enum]


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


class Dataset(TimestampMixin, Base):
    __tablename__ = "datasets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    source: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[DatasetStatus] = mapped_column(
        Enum(DatasetStatus, name="dataset_status", values_callable=enum_values),
        default=DatasetStatus.PENDING,
        nullable=False,
    )
    row_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feature_columns: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    target_column: Mapped[str | None] = mapped_column(String(255), nullable=True)
    uploaded_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    uploaded_by: Mapped["User | None"] = relationship("User", back_populates="datasets")
    predictions: Mapped[list["PredictionHistory"]] = relationship(
        "PredictionHistory",
        back_populates="dataset",
    )
    model_metadata: Mapped[list["ModelMetadata"]] = relationship(
        "ModelMetadata",
        back_populates="dataset",
    )
    reports: Mapped[list["Report"]] = relationship("Report", back_populates="dataset")


class ModelMetadata(TimestampMixin, Base):
    __tablename__ = "model_metadata"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    version: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    algorithm: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[ModelStatus] = mapped_column(
        Enum(ModelStatus, name="model_status", values_callable=enum_values),
        default=ModelStatus.TRAINING,
        nullable=False,
    )
    metrics: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    parameters: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    artifact_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    trained_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    dataset_id: Mapped[int | None] = mapped_column(
        ForeignKey("datasets.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    dataset: Mapped[Dataset | None] = relationship("Dataset", back_populates="model_metadata")
    created_by: Mapped["User | None"] = relationship("User", back_populates="model_metadata")
    predictions: Mapped[list["PredictionHistory"]] = relationship(
        "PredictionHistory",
        back_populates="model",
    )


class PredictionHistory(TimestampMixin, Base):
    __tablename__ = "prediction_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    location_name: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    predicted_aqi: Mapped[float | None] = mapped_column(Float, nullable=True)
    prediction_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    input_payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    output_payload: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    status: Mapped[PredictionStatus] = mapped_column(
        Enum(PredictionStatus, name="prediction_status", values_callable=enum_values),
        default=PredictionStatus.COMPLETED,
        nullable=False,
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    dataset_id: Mapped[int | None] = mapped_column(
        ForeignKey("datasets.id", ondelete="SET NULL"),
        nullable=True,
    )
    model_id: Mapped[int | None] = mapped_column(
        ForeignKey("model_metadata.id", ondelete="SET NULL"),
        nullable=True,
    )

    user: Mapped["User | None"] = relationship("User", back_populates="prediction_history")
    dataset: Mapped[Dataset | None] = relationship("Dataset", back_populates="predictions")
    model: Mapped[ModelMetadata | None] = relationship("ModelMetadata", back_populates="predictions")
    reports: Mapped[list["Report"]] = relationship("Report", back_populates="prediction")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="prediction")


class Hotspot(TimestampMixin, Base):
    __tablename__ = "hotspots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    radius_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    average_aqi: Mapped[float | None] = mapped_column(Float, nullable=True)
    max_aqi: Mapped[float | None] = mapped_column(Float, nullable=True)
    detected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="hotspot")
    reports: Mapped[list["Report"]] = relationship("Report", back_populates="hotspot")


class Alert(TimestampMixin, Base):
    __tablename__ = "alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[AlertSeverity] = mapped_column(
        Enum(AlertSeverity, name="alert_severity", values_callable=enum_values),
        nullable=False,
    )
    status: Mapped[AlertStatus] = mapped_column(
        Enum(AlertStatus, name="alert_status", values_callable=enum_values),
        default=AlertStatus.ACTIVE,
        nullable=False,
    )
    threshold_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    observed_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    triggered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    hotspot_id: Mapped[int | None] = mapped_column(
        ForeignKey("hotspots.id", ondelete="SET NULL"),
        nullable=True,
    )
    prediction_id: Mapped[int | None] = mapped_column(
        ForeignKey("prediction_history.id", ondelete="SET NULL"),
        nullable=True,
    )

    user: Mapped["User | None"] = relationship("User", back_populates="alerts")
    hotspot: Mapped[Hotspot | None] = relationship("Hotspot", back_populates="alerts")
    prediction: Mapped[PredictionHistory | None] = relationship(
        "PredictionHistory",
        back_populates="alerts",
    )


class Report(TimestampMixin, Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[ReportStatus] = mapped_column(
        Enum(ReportStatus, name="report_status", values_callable=enum_values),
        default=ReportStatus.DRAFT,
        nullable=False,
    )
    file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    report_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    parameters: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    generated_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    dataset_id: Mapped[int | None] = mapped_column(
        ForeignKey("datasets.id", ondelete="SET NULL"),
        nullable=True,
    )
    prediction_id: Mapped[int | None] = mapped_column(
        ForeignKey("prediction_history.id", ondelete="SET NULL"),
        nullable=True,
    )
    hotspot_id: Mapped[int | None] = mapped_column(
        ForeignKey("hotspots.id", ondelete="SET NULL"),
        nullable=True,
    )

    generated_by: Mapped["User | None"] = relationship("User", back_populates="reports")
    dataset: Mapped[Dataset | None] = relationship("Dataset", back_populates="reports")
    prediction: Mapped[PredictionHistory | None] = relationship(
        "PredictionHistory",
        back_populates="reports",
    )
    hotspot: Mapped[Hotspot | None] = relationship("Hotspot", back_populates="reports")
