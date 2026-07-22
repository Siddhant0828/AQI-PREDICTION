from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Any
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config.settings import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(subject: str, role: str) -> str:
    expires_delta = timedelta(minutes=settings.access_token_expire_minutes)
    return _create_token(
        subject=subject,
        token_type="access",
        expires_delta=expires_delta,
        extra_claims={"role": role},
    )


def create_refresh_token(subject: str) -> tuple[str, str, datetime]:
    token_id = str(uuid4())
    expires_delta = timedelta(days=settings.refresh_token_expire_days)
    expires_at = datetime.now(UTC) + expires_delta
    token = _create_token(
        subject=subject,
        token_type="refresh",
        expires_delta=expires_delta,
        extra_claims={"jti": token_id},
    )
    return token, token_id, expires_at


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except JWTError as exc:
        raise ValueError("Invalid token") from exc


def hash_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


def _create_token(
    subject: str,
    token_type: str,
    expires_delta: timedelta,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    now = datetime.now(UTC)
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
