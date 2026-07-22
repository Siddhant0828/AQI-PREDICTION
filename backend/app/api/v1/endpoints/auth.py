from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LogoutRequest,
    MessageResponse,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserRead
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_db),
) -> User:
    return await AuthService(session).register(payload)


@router.post("/login", response_model=TokenResponse, status_code=status.HTTP_200_OK)
async def login(
    payload: LoginRequest,
    session: AsyncSession = Depends(get_db),
) -> TokenResponse:
    return await AuthService(session).login(payload)


@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def logout(
    payload: LogoutRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await AuthService(session).logout(user=current_user, refresh_token=payload.refresh_token)
    return MessageResponse(detail="Logged out successfully.")


@router.get("/me", response_model=UserRead, status_code=status.HTTP_200_OK)
async def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
