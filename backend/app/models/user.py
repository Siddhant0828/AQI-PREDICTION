from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.base import TimestampMixin

if TYPE_CHECKING:
    from app.models.air_quality import Alert, Dataset, ModelMetadata, PredictionHistory, Report


class UserRole(StrEnum):
    ADMIN = "admin"
    USER = "user"


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda enum: [item.value for item in enum]),
        default=UserRole.USER,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    datasets: Mapped[list["Dataset"]] = relationship("Dataset", back_populates="uploaded_by")
    prediction_history: Mapped[list["PredictionHistory"]] = relationship(
        "PredictionHistory",
        back_populates="user",
    )
    reports: Mapped[list["Report"]] = relationship("Report", back_populates="generated_by")
    alerts: Mapped[list["Alert"]] = relationship("Alert", back_populates="user")
    model_metadata: Mapped[list["ModelMetadata"]] = relationship(
        "ModelMetadata",
        back_populates="created_by",
    )


class RefreshToken(TimestampMixin, Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    token_id: Mapped[str] = mapped_column(String(36), unique=True, index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="refresh_tokens")
