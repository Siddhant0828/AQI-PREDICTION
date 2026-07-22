"""create air quality tables

Revision ID: 202607130002
Revises: 202607130001
Create Date: 2026-07-13
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202607130002"
down_revision: str | None = "202607130001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    dataset_status = sa.Enum("pending", "processing", "ready", "failed", name="dataset_status")
    prediction_status = sa.Enum("pending", "completed", "failed", name="prediction_status")
    report_status = sa.Enum("draft", "generated", "archived", name="report_status")
    alert_severity = sa.Enum("low", "moderate", "high", "critical", name="alert_severity")
    alert_status = sa.Enum("active", "acknowledged", "resolved", name="alert_status")
    model_status = sa.Enum("training", "active", "deprecated", "failed", name="model_status")

    for enum_type in (
        dataset_status,
        prediction_status,
        report_status,
        alert_severity,
        alert_status,
        model_status,
    ):
        enum_type.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "datasets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("source", sa.String(length=255), nullable=True),
        sa.Column("file_path", sa.String(length=500), nullable=True),
        sa.Column("status", dataset_status, nullable=False),
        sa.Column("row_count", sa.Integer(), nullable=True),
        sa.Column("feature_columns", sa.JSON(), nullable=True),
        sa.Column("target_column", sa.String(length=255), nullable=True),
        sa.Column("uploaded_by_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["uploaded_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_datasets_id"), "datasets", ["id"], unique=False)
    op.create_index(op.f("ix_datasets_name"), "datasets", ["name"], unique=False)

    op.create_table(
        "hotspots",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=False),
        sa.Column("longitude", sa.Float(), nullable=False),
        sa.Column("radius_km", sa.Float(), nullable=True),
        sa.Column("average_aqi", sa.Float(), nullable=True),
        sa.Column("max_aqi", sa.Float(), nullable=True),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_hotspots_id"), "hotspots", ["id"], unique=False)
    op.create_index(op.f("ix_hotspots_name"), "hotspots", ["name"], unique=False)

    op.create_table(
        "model_metadata",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("version", sa.String(length=100), nullable=False),
        sa.Column("algorithm", sa.String(length=255), nullable=True),
        sa.Column("status", model_status, nullable=False),
        sa.Column("metrics", sa.JSON(), nullable=True),
        sa.Column("parameters", sa.JSON(), nullable=True),
        sa.Column("artifact_path", sa.String(length=500), nullable=True),
        sa.Column("trained_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("dataset_id", sa.Integer(), nullable=True),
        sa.Column("created_by_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_model_metadata_id"), "model_metadata", ["id"], unique=False)
    op.create_index(op.f("ix_model_metadata_name"), "model_metadata", ["name"], unique=False)
    op.create_index(op.f("ix_model_metadata_version"), "model_metadata", ["version"], unique=False)

    op.create_table(
        "prediction_history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("location_name", sa.String(length=255), nullable=True),
        sa.Column("latitude", sa.Float(), nullable=True),
        sa.Column("longitude", sa.Float(), nullable=True),
        sa.Column("predicted_aqi", sa.Float(), nullable=True),
        sa.Column("prediction_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("input_payload", sa.JSON(), nullable=True),
        sa.Column("output_payload", sa.JSON(), nullable=True),
        sa.Column("status", prediction_status, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("dataset_id", sa.Integer(), nullable=True),
        sa.Column("model_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["model_id"], ["model_metadata.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_prediction_history_id"), "prediction_history", ["id"], unique=False)
    op.create_index(
        op.f("ix_prediction_history_location_name"),
        "prediction_history",
        ["location_name"],
        unique=False,
    )

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("severity", alert_severity, nullable=False),
        sa.Column("status", alert_status, nullable=False),
        sa.Column("threshold_value", sa.Float(), nullable=True),
        sa.Column("observed_value", sa.Float(), nullable=True),
        sa.Column("triggered_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("acknowledged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("hotspot_id", sa.Integer(), nullable=True),
        sa.Column("prediction_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["hotspot_id"], ["hotspots.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["prediction_id"], ["prediction_history.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_alerts_id"), "alerts", ["id"], unique=False)

    op.create_table(
        "reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", report_status, nullable=False),
        sa.Column("file_path", sa.String(length=500), nullable=True),
        sa.Column("report_date", sa.Date(), nullable=True),
        sa.Column("parameters", sa.JSON(), nullable=True),
        sa.Column("generated_by_id", sa.Integer(), nullable=True),
        sa.Column("dataset_id", sa.Integer(), nullable=True),
        sa.Column("prediction_id", sa.Integer(), nullable=True),
        sa.Column("hotspot_id", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["dataset_id"], ["datasets.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["generated_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["hotspot_id"], ["hotspots.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["prediction_id"], ["prediction_history.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_reports_id"), "reports", ["id"], unique=False)
    op.create_index(op.f("ix_reports_title"), "reports", ["title"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_reports_title"), table_name="reports")
    op.drop_index(op.f("ix_reports_id"), table_name="reports")
    op.drop_table("reports")

    op.drop_index(op.f("ix_alerts_id"), table_name="alerts")
    op.drop_table("alerts")

    op.drop_index(op.f("ix_prediction_history_location_name"), table_name="prediction_history")
    op.drop_index(op.f("ix_prediction_history_id"), table_name="prediction_history")
    op.drop_table("prediction_history")

    op.drop_index(op.f("ix_model_metadata_version"), table_name="model_metadata")
    op.drop_index(op.f("ix_model_metadata_name"), table_name="model_metadata")
    op.drop_index(op.f("ix_model_metadata_id"), table_name="model_metadata")
    op.drop_table("model_metadata")

    op.drop_index(op.f("ix_hotspots_name"), table_name="hotspots")
    op.drop_index(op.f("ix_hotspots_id"), table_name="hotspots")
    op.drop_table("hotspots")

    op.drop_index(op.f("ix_datasets_name"), table_name="datasets")
    op.drop_index(op.f("ix_datasets_id"), table_name="datasets")
    op.drop_table("datasets")

    for enum_name in (
        "model_status",
        "alert_status",
        "alert_severity",
        "report_status",
        "prediction_status",
        "dataset_status",
    ):
        sa.Enum(name=enum_name).drop(op.get_bind(), checkfirst=True)
