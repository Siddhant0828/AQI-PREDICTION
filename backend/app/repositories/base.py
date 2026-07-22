from collections.abc import Sequence
from typing import Any, Generic, TypeVar

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: type[ModelType], session: AsyncSession) -> None:
        self.model = model
        self.session = session

    async def get(self, id: int) -> ModelType | None:
        result = await self.session.execute(select(self.model).where(self.model.id == id))
        return result.scalar_one_or_none()

    async def list(
        self,
        *,
        page: int = 1,
        size: int = 20,
        statement: Select[tuple[ModelType]] | None = None,
    ) -> tuple[Sequence[ModelType], int]:
        stmt = statement or select(self.model)
        total_result = await self.session.execute(
            select(func.count()).select_from(stmt.order_by(None).subquery())
        )
        total = total_result.scalar_one()

        result = await self.session.execute(stmt.offset((page - 1) * size).limit(size))
        return result.scalars().all(), total

    async def create(self, payload: CreateSchemaType | dict[str, Any]) -> ModelType:
        data = self._to_dict(payload)
        db_obj = self.model(**data)
        self.session.add(db_obj)
        await self.session.flush()
        await self.session.refresh(db_obj)
        return db_obj

    async def update(self, db_obj: ModelType, payload: UpdateSchemaType | dict[str, Any]) -> ModelType:
        data = self._to_dict(payload, exclude_unset=True)
        for field, value in data.items():
            setattr(db_obj, field, value)

        self.session.add(db_obj)
        await self.session.flush()
        await self.session.refresh(db_obj)
        return db_obj

    async def delete(self, db_obj: ModelType) -> None:
        await self.session.delete(db_obj)
        await self.session.flush()

    def _to_dict(self, payload: Any, *, exclude_unset: bool = False) -> dict[str, Any]:
        if isinstance(payload, dict):
            return payload
        if hasattr(payload, "model_dump"):
            return payload.model_dump(exclude_unset=exclude_unset)
        raise TypeError("Payload must be a dictionary or Pydantic model.")
