import csv
from dataclasses import dataclass
from datetime import date
from io import BytesIO, StringIO
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.air_quality import Hotspot, PredictionHistory
from app.repositories.air_quality import HotspotRepository, PredictionHistoryRepository
from app.schemas.reports import ReportFormat, ReportKind


@dataclass(frozen=True)
class GeneratedReport:
    filename: str
    media_type: str
    content: bytes


class ReportService:
    def __init__(self, session: AsyncSession) -> None:
        self.prediction_history_repository = PredictionHistoryRepository(session)
        self.hotspot_repository = HotspotRepository(session)

    async def generate_prediction_report(
        self,
        *,
        report_format: ReportFormat,
        start_date: date | None = None,
        end_date: date | None = None,
        limit: int = 1000,
    ) -> GeneratedReport:
        records = await self.prediction_history_repository.list_for_report(
            start_date=start_date,
            end_date=end_date,
            limit=limit,
        )
        headers = [
            "id",
            "prediction_date",
            "latitude",
            "longitude",
            "pm25",
            "pm10",
            "aqi",
            "status",
        ]
        rows = [self._prediction_row(record) for record in records]
        return self._render(
            kind=ReportKind.PREDICTIONS,
            report_format=report_format,
            title="Prediction Report",
            headers=headers,
            rows=rows,
        )

    async def generate_aqi_report(
        self,
        *,
        report_format: ReportFormat,
        start_date: date | None = None,
        end_date: date | None = None,
        limit: int = 1000,
    ) -> GeneratedReport:
        records = await self.prediction_history_repository.list_for_report(
            start_date=start_date,
            end_date=end_date,
            limit=limit,
        )
        headers = ["id", "prediction_date", "latitude", "longitude", "aqi", "status"]
        rows = [self._aqi_row(record) for record in records]
        return self._render(
            kind=ReportKind.AQI,
            report_format=report_format,
            title="AQI Report",
            headers=headers,
            rows=rows,
        )

    async def generate_hotspot_report(
        self,
        *,
        report_format: ReportFormat,
        active_only: bool = False,
        limit: int = 1000,
    ) -> GeneratedReport:
        records = await self.hotspot_repository.list_for_report(
            active_only=active_only,
            limit=limit,
        )
        headers = [
            "id",
            "name",
            "latitude",
            "longitude",
            "radius_km",
            "average_aqi",
            "max_aqi",
            "detected_at",
            "is_active",
        ]
        rows = [self._hotspot_row(record) for record in records]
        return self._render(
            kind=ReportKind.HOTSPOTS,
            report_format=report_format,
            title="Hotspot Report",
            headers=headers,
            rows=rows,
        )

    def _render(
        self,
        *,
        kind: ReportKind,
        report_format: ReportFormat,
        title: str,
        headers: list[str],
        rows: list[dict[str, Any]],
    ) -> GeneratedReport:
        if report_format == ReportFormat.CSV:
            return GeneratedReport(
                filename=f"{kind.value}_report.csv",
                media_type="text/csv",
                content=self._render_csv(headers, rows),
            )
        if report_format == ReportFormat.PDF:
            return GeneratedReport(
                filename=f"{kind.value}_report.pdf",
                media_type="application/pdf",
                content=self._render_pdf(title, headers, rows),
            )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unsupported report format.",
        )

    def _render_csv(self, headers: list[str], rows: list[dict[str, Any]]) -> bytes:
        buffer = StringIO()
        writer = csv.DictWriter(buffer, fieldnames=headers, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)
        return buffer.getvalue().encode("utf-8")

    def _render_pdf(self, title: str, headers: list[str], rows: list[dict[str, Any]]) -> bytes:
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import landscape, letter
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="PDF generation dependency is not installed.",
            ) from exc

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(letter),
            rightMargin=24,
            leftMargin=24,
            topMargin=24,
            bottomMargin=24,
        )
        styles = getSampleStyleSheet()
        table_data = [headers]
        table_data.extend([[self._stringify(row.get(header)) for header in headers] for row in rows])
        if len(table_data) == 1:
            table_data.append(["" for _ in headers])

        table = Table(table_data, repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1F2937")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#D1D5DB")),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ]
            )
        )
        doc.build([Paragraph(title, styles["Title"]), Spacer(1, 12), table])
        return buffer.getvalue()

    def _prediction_row(self, record: PredictionHistory) -> dict[str, Any]:
        output_payload = record.output_payload if isinstance(record.output_payload, dict) else {}
        return {
            "id": record.id,
            "prediction_date": self._iso(record.prediction_date),
            "latitude": record.latitude,
            "longitude": record.longitude,
            "pm25": output_payload.get("pm25"),
            "pm10": output_payload.get("pm10"),
            "aqi": self._payload_value(output_payload, "aqi", record.predicted_aqi),
            "status": output_payload.get("status", record.status.value),
        }

    def _aqi_row(self, record: PredictionHistory) -> dict[str, Any]:
        output_payload = record.output_payload if isinstance(record.output_payload, dict) else {}
        return {
            "id": record.id,
            "prediction_date": self._iso(record.prediction_date),
            "latitude": record.latitude,
            "longitude": record.longitude,
            "aqi": self._payload_value(output_payload, "aqi", record.predicted_aqi),
            "status": output_payload.get("status", record.status.value),
        }

    def _hotspot_row(self, record: Hotspot) -> dict[str, Any]:
        return {
            "id": record.id,
            "name": record.name,
            "latitude": record.latitude,
            "longitude": record.longitude,
            "radius_km": record.radius_km,
            "average_aqi": record.average_aqi,
            "max_aqi": record.max_aqi,
            "detected_at": self._iso(record.detected_at),
            "is_active": record.is_active,
        }

    def _iso(self, value: Any) -> str | None:
        return value.isoformat() if value is not None else None

    def _payload_value(self, payload: dict[str, Any], key: str, fallback: Any) -> Any:
        value = payload.get(key)
        return fallback if value is None else value

    def _stringify(self, value: Any) -> str:
        return "" if value is None else str(value)
