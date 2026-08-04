import json
import logging
from typing import Any

from app.config.settings import settings

logger = logging.getLogger(__name__)


class RedisCacheService:
    def __init__(self) -> None:
        self._client: Any | None = None
        self._connection_failed: bool = False

    async def get_client(self) -> Any | None:
        if self._connection_failed:
            return None
        if self._client is not None:
            return self._client

        try:
            import redis.asyncio as aioredis

            if settings.redis_url:
                self._client = aioredis.from_url(
                    settings.redis_url, decode_responses=True
                )
            else:
                self._client = aioredis.Redis(
                    host=settings.redis_host,
                    port=settings.redis_port,
                    db=settings.redis_db,
                    password=settings.redis_password or None,
                    decode_responses=True,
                    socket_connect_timeout=2.0,
                )
            await self._client.ping()
            return self._client
        except Exception as exc:
            logger.warning(
                f"Redis cache connection failed ({exc}). Operating in direct fetch mode."
            )
            self._connection_failed = True
            self._client = None
            return None

    async def get_cached_sequence(self, key: str) -> list[list[float]] | None:
        client = await self.get_client()
        if client is None:
            return None
        try:
            val = await client.get(key)
            if val:
                return json.loads(val)
        except Exception as exc:
            logger.warning(f"Error reading from Redis key '{key}': {exc}")
        return None

    async def set_cached_sequence(
        self, key: str, data: list[list[float]], ttl: int | None = None
    ) -> bool:
        client = await self.get_client()
        if client is None:
            return False
        try:
            ex = ttl if ttl is not None else settings.redis_ttl_seconds
            json_str = json.dumps(data)
            await client.set(key, json_str, ex=ex)
            return True
        except Exception as exc:
            logger.warning(f"Error writing to Redis key '{key}': {exc}")
            return False
