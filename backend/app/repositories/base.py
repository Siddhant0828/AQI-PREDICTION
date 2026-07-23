from collections.abc import Sequence
from typing import Any, Generic, TypeVar

from beanie import Document
from beanie.odm.queries.find import FindMany

ModelType = TypeVar("ModelType", bound=Document)
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")


class BaseRepository(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: type[ModelType]) -> None:
        self.model = model

    async def get(self, id: Any) -> ModelType | None:
        return await self.model.get(id)

    async def list(
        self,
        *,
        page: int = 1,
        size: int = 20,
        query: FindMany | None = None,
    ) -> tuple[Sequence[ModelType], int]:
        base_query = query if query is not None else self.model.find_all()
        total = await base_query.count()
        result = await base_query.skip((page - 1) * size).limit(size).to_list()
        return result, total

    async def create(self, payload: CreateSchemaType | dict[str, Any]) -> ModelType:
        data = self._to_dict(payload)
        db_obj = self.model(**data)
        await db_obj.insert()
        return db_obj

    async def update(self, db_obj: ModelType, payload: UpdateSchemaType | dict[str, Any]) -> ModelType:
        data = self._to_dict(payload, exclude_unset=True)
        for field, value in data.items():
            setattr(db_obj, field, value)
        await db_obj.save()
        return db_obj

    async def delete(self, db_obj: ModelType) -> None:
        await db_obj.delete()

    def _to_dict(self, payload: Any, *, exclude_unset: bool = False) -> dict[str, Any]:
        if isinstance(payload, dict):
            return payload
        if hasattr(payload, "model_dump"):
            return payload.model_dump(exclude_unset=exclude_unset)
        raise TypeError("Payload must be a dictionary or Pydantic model.")
