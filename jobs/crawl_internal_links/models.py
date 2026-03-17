"""Data models for internal link crawling."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class CrawlInternalLinksConfig:
    """Runtime config for one internal-link crawl execution."""

    target_site_host: str
    start_url: str
    max_pages: int
    request_timeout_seconds: int
    user_agent: str
    skip_bigquery_write: bool


@dataclass(slots=True)
class InternalLinkRecord:
    """One normalized internal link edge."""

    source_url: str
    target_url: str
    anchor_text: str | None
    status_code: int | None


@dataclass(slots=True)
class InternalLinksCrawlResult:
    """Aggregate result of one crawl execution."""

    rows: list[InternalLinkRecord]
    crawled_pages: int
    discovered_targets: int
    broken_links: int


@dataclass(slots=True)
class BigQueryWriteResult:
    """Normalized BigQuery write counters."""

    fetched_rows: int
    inserted_rows: int
    updated_rows: int
    skipped_rows: int
    staging_table_id: str
