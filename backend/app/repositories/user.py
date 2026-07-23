from datetime import UTC, datetime
from typing import Any

from app.core.security import hash_token
from app.models.user import RefreshToken, User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User, Any, Any]):
    def __init__(self) -> None:
        super().__init__(User)

    async def get_by_id(self, user_id: Any) -> User | None:
        return await User.get(user_id)

    async def get_by_email(self, email: str) -> User | None:
        return await User.find_one(User.email == email.lower())


class RefreshTokenRepository(BaseRepository[RefreshToken, Any, Any]):
    def __init__(self) -> None:
        super().__init__(RefreshToken)

    async def create(
        self,
        *,
        token: str,
        token_id: str,
        user_id: Any,
        expires_at: datetime,
    ) -> RefreshToken:
        refresh_token = RefreshToken(
            token_id=token_id,
            token_hash=hash_token(token),
            user_id=user_id,
            expires_at=expires_at,
        )
        await refresh_token.insert()
        return refresh_token

    async def get_active_by_token(self, token: str, token_id: str) -> RefreshToken | None:
        return await RefreshToken.find_one(
            RefreshToken.token_hash == hash_token(token),
            RefreshToken.token_id == token_id,
            RefreshToken.revoked_at == None,
            RefreshToken.expires_at > datetime.now(UTC),
        )

    async def revoke(self, refresh_token: RefreshToken) -> None:
        refresh_token.revoked_at = datetime.now(UTC)
        await refresh_token.save()
