"""Typed models for the Search Console fetch job."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any


@dataclass(slots=True)
class FetchGscConfig:
    """Runtime configuration for one fetch_gsc execution."""

    property_uri: str
    target_site_host: str
    start_date: str
    end_date: str
    row_limit: int = 25_000
    search_type: str = "web"
    skip_bigquery_write: bool = False
    dimensions: tuple[str, str, str] = ("date", "page", "query")


@dataclass(slots=True)
class GscSearchRow:
    """Normalized Search Analytics row."""

    date: str
    page: str
    query: str
    clicks: float | None
    impressions: float | None
    ctr: float | None
    position: float | None

    def to_dict(self) -> dict[str, Any]:
        """Returns the row as a plain JSON-serializable dict."""

        return asdict(self)


@dataclass(slots=True)
class BigQueryWriteResult:
    """Summary for one BigQuery upsert execution."""

    fetched_rows: int
    inserted_rows: int
    updated_rows: int
    skipped_rows: int
    staging_table_id: str
