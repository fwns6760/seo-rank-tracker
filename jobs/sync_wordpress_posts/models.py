"""Shared models for the WordPress sync job."""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(slots=True)
class WordPressSyncConfig:
    """Runtime configuration for the WordPress sync job."""

    base_url: str
    api_base_url: str
    target_site_host: str
    post_type: str
    auth_mode: str = "none"
    statuses: tuple[str, ...] = ("publish",)
    page_size: int = 100
    request_timeout_seconds: int = 30
    user_agent: str = "seo-rank-tracker-wordpress-sync/1.0"
    auth_username: str | None = None
    auth_application_password: str | None = None
    auth_application_password_secret_name: str | None = None
    skip_bigquery_write: bool = False
    max_pages: int | None = None
    config_sources: dict[str, str] = field(default_factory=dict)


@dataclass(slots=True)
class WordPressPostRecord:
    """Canonical normalized post metadata row from the WordPress REST API."""

    wp_post_id: int
    url: str
    slug: str
    title: str | None
    post_type: str
    post_status: str
    published_at: str | None
    modified_at: str | None
    categories: list[str] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    content_hash: str | None = None
    word_count: int | None = None


@dataclass(slots=True)
class BigQueryWriteResult:
    """Summary of one BigQuery sync execution."""

    fetched_rows: int
    inserted_rows: int
    updated_rows: int
    skipped_rows: int
    staging_table_id: str
