from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "AI Air Quality Monitoring API"
    app_env: str = "local"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"

    mongodb_uri: str = Field(
        default="mongodb://localhost:27017"
    )
    mongodb_db_name: str = "aqi_monitoring"

    jwt_secret_key: str = "change-this-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7

    backend_cors_origins: list[str] = Field(default_factory=list)
    log_level: str = "INFO"

    open_meteo_timeout_seconds: int = Field(default=10)
    gee_project_id: str | None = Field(default=None)
    
    # OpenAQ & WAQI (CPCB) Configuration
    openaq_api_key: str = Field(
        default="a15d33c429b062acffad8440c9ce6823484724a9dafcf916f345a6ed09d72abd"
    )
    waqi_api_token: str = Field(default="")
    cpcb_max_radius_km: float = Field(default=150.0)
    open_meteo_retry_count: int = 3
    open_meteo_retry_backoff_seconds: float = 1.0

    # Redis Cache Configuration
    redis_host: str = Field(default="localhost")
    redis_port: int = Field(default=6379)
    redis_db: int = Field(default=0)
    redis_password: str | None = Field(default=None)
    redis_url: str = Field(default="")
    redis_ttl_seconds: int = Field(default=86400)

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
