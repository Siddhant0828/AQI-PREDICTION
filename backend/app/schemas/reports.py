from enum import StrEnum


class ReportFormat(StrEnum):
    CSV = "csv"
    PDF = "pdf"


class ReportKind(StrEnum):
    PREDICTIONS = "predictions"
    AQI = "aqi"
    HOTSPOTS = "hotspots"
