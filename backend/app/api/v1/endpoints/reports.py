from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.schemas.reports import ReportFormat
from app.services.reporting import GeneratedReport, ReportService

router = APIRouter(prefix="/reports", tags=["reports"])


def validate_date_range(start_date: date | None, end_date: date | None) -> None:
    if start_date is not None and end_date is not None and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start_date must be less than or equal to end_date.",
        )


def report_response(report: GeneratedReport) -> Response:
    return Response(
        content=report.content,
        media_type=report.media_type,
        headers={"Content-Disposition": f'attachment; filename="{report.filename}"'},
    )


@router.get("/predictions", status_code=status.HTTP_200_OK)
async def get_prediction_report(
    format_: ReportFormat = Query(default=ReportFormat.CSV, alias="format"),
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = Query(default=1000, ge=1, le=10000),
    session: AsyncSession = Depends(get_db),
) -> Response:
    validate_date_range(start_date, end_date)
    report = await ReportService(session).generate_prediction_report(
        report_format=format_,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )
    return report_response(report)


@router.get("/aqi", status_code=status.HTTP_200_OK)
async def get_aqi_report(
    format_: ReportFormat = Query(default=ReportFormat.CSV, alias="format"),
    start_date: date | None = None,
    end_date: date | None = None,
    limit: int = Query(default=1000, ge=1, le=10000),
    session: AsyncSession = Depends(get_db),
) -> Response:
    validate_date_range(start_date, end_date)
    report = await ReportService(session).generate_aqi_report(
        report_format=format_,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
    )
    return report_response(report)


@router.get("/hotspots", status_code=status.HTTP_200_OK)
async def get_hotspot_report(
    format_: ReportFormat = Query(default=ReportFormat.CSV, alias="format"),
    active_only: bool = False,
    limit: int = Query(default=1000, ge=1, le=10000),
    session: AsyncSession = Depends(get_db),
) -> Response:
    report = await ReportService(session).generate_hotspot_report(
        report_format=format_,
        active_only=active_only,
        limit=limit,
    )
    return report_response(report)
