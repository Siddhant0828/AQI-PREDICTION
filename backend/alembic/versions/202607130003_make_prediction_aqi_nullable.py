"""make prediction aqi nullable

Revision ID: 202607130003
Revises: 202607130002
Create Date: 2026-07-13
"""
from __future__ import annotations

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

revision: str = "202607130003"
down_revision: str | None = "202607130002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "prediction_history",
        "predicted_aqi",
        existing_type=sa.Float(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "prediction_history",
        "predicted_aqi",
        existing_type=sa.Float(),
        nullable=False,
    )
