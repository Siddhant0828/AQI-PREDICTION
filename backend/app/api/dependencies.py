from collections.abc import Awaitable, Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.security import decode_token
from app.models.user import User, UserRole
from app.repositories.user import UserRepository
from app.services.model_artifacts import ModelArtifactService
from app.services.prediction import PredictionService

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access" or not payload.get("sub"):
            raise ValueError("Invalid access token")
        user_id = str(payload["sub"])
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token is invalid or expired.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = await UserRepository().get_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive.",
        )

    return user


def require_roles(*roles: UserRole) -> Callable[[User], Awaitable[User]]:
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions.",
            )
        return current_user

    return role_checker


def get_model_artifact_service(request: Request) -> ModelArtifactService:
    return request.app.state.model_artifact_service


def get_prediction_service(
    model_artifact_service: ModelArtifactService = Depends(get_model_artifact_service),
) -> PredictionService:
    return PredictionService(model_artifact_service)
