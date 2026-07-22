from functools import lru_cache

from pydantic import Field, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Air Quality Monitoring API"
    app_env: str = "local"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    database_url: str | PostgresDsn = Field(
        default="postgresql+asyncpg://aqi_user:change-me@localhost:5432/aqi_monitoring"
    )

    jwt_secret_key: str = "change-this-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    backend_cors_origins: list[str] = Field(default_factory=list)
    log_level: str = "INFO"

    open_meteo_timeout_seconds: int = 10
    open_meteo_retry_count: int = 3
    open_meteo_retry_backoff_seconds: float = 1.0

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
