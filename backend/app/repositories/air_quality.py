from collections.abc import Sequence
from datetime import date, datetime, time

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

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
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Dataset, session)

    async def list_by_uploader(
        self,
        uploaded_by_id: int,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[Dataset], int]:
        return await self.list(
            page=page,
            size=size,
            statement=select(Dataset).where(Dataset.uploaded_by_id == uploaded_by_id),
        )


class PredictionHistoryRepository(
    BaseRepository[PredictionHistory, PredictionHistoryCreate, PredictionHistoryUpdate]
):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(PredictionHistory, session)

    async def list_by_user(
        self,
        user_id: int,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[PredictionHistory], int]:
        return await self.list(
            page=page,
            size=size,
            statement=select(PredictionHistory).where(PredictionHistory.user_id == user_id),
        )

    async def list_by_dataset(
        self,
        dataset_id: int,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[PredictionHistory], int]:
        return await self.list(
            page=page,
            size=size,
            statement=select(PredictionHistory).where(PredictionHistory.dataset_id == dataset_id),
        )

    async def list_for_aqi_map(self, *, limit: int = 500) -> Sequence[PredictionHistory]:
        result = await self.session.execute(
            select(PredictionHistory)
            .where(
                PredictionHistory.latitude.is_not(None),
                PredictionHistory.longitude.is_not(None),
            )
            .order_by(desc(PredictionHistory.prediction_date), desc(PredictionHistory.id))
            .limit(limit)
        )
        return result.scalars().all()

    async def list_for_report(
        self,
        *,
        start_date: date | None = None,
        end_date: date | None = None,
        limit: int = 1000,
    ) -> Sequence[PredictionHistory]:
        stmt = select(PredictionHistory).order_by(
            desc(PredictionHistory.prediction_date),
            desc(PredictionHistory.id),
        )
        if start_date is not None:
            stmt = stmt.where(
                PredictionHistory.prediction_date
                >= datetime.combine(start_date, time.min)
            )
        if end_date is not None:
            stmt = stmt.where(
                PredictionHistory.prediction_date
                <= datetime.combine(end_date, time.max)
            )

        result = await self.session.execute(stmt.limit(limit))
        return result.scalars().all()


class ReportRepository(BaseRepository[Report, ReportCreate, ReportUpdate]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Report, session)

    async def list_by_user(
        self,
        generated_by_id: int,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[Report], int]:
        return await self.list(
            page=page,
            size=size,
            statement=select(Report).where(Report.generated_by_id == generated_by_id),
        )


class HotspotRepository(BaseRepository[Hotspot, HotspotCreate, HotspotUpdate]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Hotspot, session)

    async def list_active(
        self,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[Hotspot], int]:
        return await self.list(
            page=page,
            size=size,
            statement=select(Hotspot).where(Hotspot.is_active.is_(True)),
        )

    async def list_for_report(
        self,
        *,
        active_only: bool = False,
        limit: int = 1000,
    ) -> Sequence[Hotspot]:
        stmt = select(Hotspot).order_by(desc(Hotspot.detected_at), desc(Hotspot.id))
        if active_only:
            stmt = stmt.where(Hotspot.is_active.is_(True))

        result = await self.session.execute(stmt.limit(limit))
        return result.scalars().all()


class AlertRepository(BaseRepository[Alert, AlertCreate, AlertUpdate]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(Alert, session)

    async def list_by_user(
        self,
        user_id: int,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[Alert], int]:
        return await self.list(
            page=page,
            size=size,
            statement=select(Alert).where(Alert.user_id == user_id),
        )

    async def list_by_hotspot(
        self,
        hotspot_id: int,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[Alert], int]:
        return await self.list(
            page=page,
            size=size,
            statement=select(Alert).where(Alert.hotspot_id == hotspot_id),
        )


class ModelMetadataRepository(
    BaseRepository[ModelMetadata, ModelMetadataCreate, ModelMetadataUpdate]
):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(ModelMetadata, session)

    async def list_by_dataset(
        self,
        dataset_id: int,
        *,
        page: int = 1,
        size: int = 20,
    ) -> tuple[Sequence[ModelMetadata], int]:
        return await self.list(
            page=page,
            size=size,
            statement=select(ModelMetadata).where(ModelMetadata.dataset_id == dataset_id),
        )
