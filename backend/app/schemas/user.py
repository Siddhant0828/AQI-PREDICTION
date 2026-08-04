from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole
from app.schemas.base import BaseSchema


class UserRead(BaseSchema):
    id: str
    email: EmailStr
    full_name: str | None = None
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None
    role: UserRole = UserRole.USER
