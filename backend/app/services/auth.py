from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.user import User, UserRole
from app.repositories.user import RefreshTokenRepository, UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.refresh_tokens = RefreshTokenRepository(session)

    async def register(self, payload: RegisterRequest) -> User:
        existing_user = await self.users.get_by_email(payload.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists.",
            )

        user = User(
            email=payload.email.lower(),
            full_name=payload.full_name,
            hashed_password=get_password_hash(payload.password),
            role=UserRole.USER,
        )

        try:
            user = await self.users.create(user)
            await self.session.commit()
        except IntegrityError as exc:
            await self.session.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A user with this email already exists.",
            ) from exc

        return user

    async def login(self, payload: LoginRequest) -> TokenResponse:
        user = await self.users.get_by_email(payload.email)
        if not user or not verify_password(payload.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive.",
            )

        access_token = create_access_token(subject=str(user.id), role=user.role.value)
        refresh_token, token_id, expires_at = create_refresh_token(subject=str(user.id))
        await self.refresh_tokens.create(
            token=refresh_token,
            token_id=token_id,
            user_id=user.id,
            expires_at=expires_at,
        )
        await self.session.commit()

        return TokenResponse(access_token=access_token, refresh_token=refresh_token)

    async def logout(self, *, user: User, refresh_token: str) -> None:
        payload = self._decode_refresh_token(refresh_token)
        token_user_id = int(payload["sub"])
        token_id = payload["jti"]

        if token_user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Refresh token does not belong to the authenticated user.",
            )

        stored_token = await self.refresh_tokens.get_active_by_token(refresh_token, token_id)
        if not stored_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is invalid or expired.",
            )

        await self.refresh_tokens.revoke(stored_token)
        await self.session.commit()

    def _decode_refresh_token(self, token: str) -> dict[str, Any]:
        try:
            payload = decode_token(token)
            if payload.get("type") != "refresh" or not payload.get("jti") or not payload.get("sub"):
                raise ValueError("Invalid refresh token")
            return payload
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token is invalid or expired.",
            ) from exc
