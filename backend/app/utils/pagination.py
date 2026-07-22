from typing import Generic, TypeVar

from pydantic import BaseModel, Field

DataType = TypeVar("DataType")


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    size: int = Field(default=20, ge=1, le=100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.size


class PaginatedResponse(BaseModel, Generic[DataType]):
    items: list[DataType]
    total: int
    page: int
    size: int
