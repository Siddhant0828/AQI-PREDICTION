from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_token
from app.models.user import RefreshToken, User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User, Any, Any]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(User, session)

    async def get_by_id(self, user_id: int) -> User | None:
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        result = await self.session.execute(select(User).where(User.email == email.lower()))
        return result.scalar_one_or_none()

    async def create(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user


class RefreshTokenRepository(BaseRepository[RefreshToken, Any, Any]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(RefreshToken, session)

    async def create(
        self,
        *,
        token: str,
        token_id: str,
        user_id: int,
        expires_at: datetime,
    ) -> RefreshToken:
        refresh_token = RefreshToken(
            token_id=token_id,
            token_hash=hash_token(token),
            user_id=user_id,
            expires_at=expires_at,
        )
        self.session.add(refresh_token)
        await self.session.flush()
        return refresh_token

    async def get_active_by_token(self, token: str, token_id: str) -> RefreshToken | None:
        result = await self.session.execute(
            select(RefreshToken).where(
                RefreshToken.token_hash == hash_token(token),
                RefreshToken.token_id == token_id,
                RefreshToken.revoked_at.is_(None),
                RefreshToken.expires_at > datetime.now(UTC),
            )
        )
        return result.scalar_one_or_none()

    async def revoke(self, refresh_token: RefreshToken) -> None:
        refresh_token.revoked_at = datetime.now(UTC)
        self.session.add(refresh_token)
        await self.session.flush()
