from datetime import datetime
from enum import StrEnum
from typing import Optional

from beanie import Document, Link
from pydantic import Field


class UserRole(StrEnum):
    ADMIN = "admin"
    USER = "user"


class User(Document):
    email: str = Field(index=True, unique=True)
    full_name: Optional[str] = None
    hashed_password: str
    role: UserRole = UserRole.USER
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"


class RefreshToken(Document):
    token_id: str = Field(index=True, unique=True)
    token_hash: str = Field(unique=True)
    user: Link[User]
    expires_at: datetime
    revoked_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "refresh_tokens"
