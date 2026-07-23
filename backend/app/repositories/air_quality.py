from collections.abc import Sequence
from datetime import date, datetime, time
from typing import Any

from app.models.air_quality import (
    Alert,
    Dataset,
    Hotspot,
    ModelMetadata,
    PredictionHistory,
    Report,
)
from app.repositories.base import BaseRepository
from app.schemas.air_quality import (
    AlertCreate,
    AlertUpdate,
    DatasetCreate,
    DatasetUpdate,
    HotspotCreate,
    HotspotUpdate,
    ModelMetadataCreate,
    ModelMetadataUpdate,
    PredictionHistoryCreate,
    PredictionHistoryUpdate,
    ReportCreate,
    ReportUpdate,
)


class DatasetRepository(BaseRepository[Dataset, DatasetCreate, DatasetUpdate]):
    def __init__(self) -> None:
        super().__init__(Dataset)

    async def list_by_uploader(
        self,
        uploaded_by_id: Any,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[Dataset], int]:
        return await self.list(
            page=page,
            size=size,
            query=Dataset.find(Dataset.uploaded_by.id == uploaded_by_id),
        )


class PredictionHistoryRepository(
    BaseRepository[PredictionHistory, PredictionHistoryCreate, PredictionHistoryUpdate]
):
    def __init__(self) -> None:
        super().__init__(PredictionHistory)

    async def list_by_user(
        self,
        user_id: Any,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[PredictionHistory], int]:
        return await self.list(
            page=page,
            size=size,
            query=PredictionHistory.find(PredictionHistory.user.id == user_id),
        )

    async def list_by_dataset(
        self,
        dataset_id: Any,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[PredictionHistory], int]:
        return await self.list(
            page=page,
            size=size,
            query=PredictionHistory.find(PredictionHistory.dataset.id == dataset_id),
        )

    async def list_for_aqi_map(self, *, limit: int = 500) -> Sequence[PredictionHistory]:
        query = PredictionHistory.find(
            PredictionHistory.latitude != None,
            PredictionHistory.longitude != None
        ).sort("-prediction_date", "-id").limit(limit)
        return await query.to_list()

    async def list_for_report(
        self,
        *,
        start_date: date | None = None,
        end_date: date | None = None,
        limit: int = 1000,
    ) -> Sequence[PredictionHistory]:
        query_parts = []
        if start_date is not None:
            query_parts.append(PredictionHistory.prediction_date >= datetime.combine(start_date, time.min))
        if end_date is not None:
            query_parts.append(PredictionHistory.prediction_date <= datetime.combine(end_date, time.max))

        query = PredictionHistory.find(*query_parts).sort("-prediction_date", "-id").limit(limit)
        return await query.to_list()


class ReportRepository(BaseRepository[Report, ReportCreate, ReportUpdate]):
    def __init__(self) -> None:
        super().__init__(Report)

    async def list_by_user(
        self,
        generated_by_id: Any,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[Report], int]:
        return await self.list(
            page=page,
            size=size,
            query=Report.find(Report.generated_by.id == generated_by_id),
        )


class HotspotRepository(BaseRepository[Hotspot, HotspotCreate, HotspotUpdate]):
    def __init__(self) -> None:
        super().__init__(Hotspot)

    async def list_active(
        self,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[Hotspot], int]:
        return await self.list(
            page=page,
            size=size,
            query=Hotspot.find(Hotspot.is_active == True),
        )

    async def list_for_report(
        self,
        *,
        active_only: bool = False,
        limit: int = 1000,
    ) -> Sequence[Hotspot]:
        query_parts = []
        if active_only:
            query_parts.append(Hotspot.is_active == True)

        query = Hotspot.find(*query_parts).sort("-detected_at", "-id").limit(limit)
        return await query.to_list()


class AlertRepository(BaseRepository[Alert, AlertCreate, AlertUpdate]):
    def __init__(self) -> None:
        super().__init__(Alert)

    async def list_by_user(
        self,
        user_id: Any,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[Alert], int]:
        return await self.list(
            page=page,
            size=size,
            query=Alert.find(Alert.user.id == user_id),
        )

    async def list_by_hotspot(
        self,
        hotspot_id: Any,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[Alert], int]:
        return await self.list(
            page=page,
            size=size,
            query=Alert.find(Alert.hotspot.id == hotspot_id),
        )


class ModelMetadataRepository(
    BaseRepository[ModelMetadata, ModelMetadataCreate, ModelMetadataUpdate]
):
    def __init__(self) -> None:
        super().__init__(ModelMetadata)

    async def list_by_dataset(
        self,
        dataset_id: Any,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[ModelMetadata], int]:
        return await self.list(
            page=page,
            size=size,
            query=ModelMetadata.find(ModelMetadata.dataset.id == dataset_id),
        )
