"""Google Search Console API client helpers."""

from __future__ import annotations

import json
import os
from collections.abc import Iterator
from datetime import date, timedelta
from typing import Any
from urllib.parse import urlparse

import google.auth
from google.oauth2 import service_account
from googleapiclient.discovery import build

from jobs.fetch_gsc.models import FetchGscConfig, GscSearchRow

SEARCH_CONSOLE_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"


def iter_request_dates(start_date: str, end_date: str) -> Iterator[str]:
    """Yields inclusive request dates in ascending order."""

    current = date.fromisoformat(start_date)
    finish = date.fromisoformat(end_date)
    while current <= finish:
        yield current.isoformat()
        current += timedelta(days=1)


def _normalize_host(value: str) -> str:
    if "://" not in value:
        return value.lower().strip("/")
    parsed = urlparse(value)
    return parsed.netloc.lower().strip("/")


def build_search_console_service() -> Any:
    """Builds an authenticated Search Console API client."""

    credentials_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON", "").strip()

    if credentials_json:
        service_account_info = json.loads(credentials_json)
        credentials = service_account.Credentials.from_service_account_info(
            service_account_info,
            scopes=[SEARCH_CONSOLE_SCOPE],
        )
    else:
        credentials, _ = google.auth.default(scopes=[SEARCH_CONSOLE_SCOPE])

    return build(
        "searchconsole",
        "v1",
        credentials=credentials,
        cache_discovery=False,
    )


def _build_request_body(
    config: FetchGscConfig,
    request_date: str,
    start_row: int,
) -> dict[str, Any]:
    return {
        "startDate": request_date,
        "endDate": request_date,
        "dimensions": list(config.dimensions),
        "searchType": config.search_type,
        "rowLimit": config.row_limit,
        "startRow": start_row,
        "dimensionFilterGroups": [
            {
                "groupType": "and",
                "filters": [
                    {
                        "dimension": "page",
                        "operator": "contains",
                        "expression": config.target_site_host,
                    }
                ],
            }
        ],
    }


def _normalize_row(raw_row: dict[str, Any]) -> GscSearchRow:
    keys = raw_row.get("keys", [])

    def read_optional_float(key: str) -> float | None:
        value = raw_row.get(key)
        return float(value) if value is not None else None

    return GscSearchRow(
        date=str(keys[0]) if len(keys) > 0 else "",
        page=str(keys[1]) if len(keys) > 1 else "",
        query=str(keys[2]) if len(keys) > 2 else "",
        clicks=read_optional_float("clicks"),
        impressions=read_optional_float("impressions"),
        ctr=read_optional_float("ctr"),
        position=read_optional_float("position"),
    )


def fetch_daily_rows(
    service: Any,
    config: FetchGscConfig,
    request_date: str,
) -> list[GscSearchRow]:
    """Fetches one day's Search Analytics rows with pagination."""

    rows: list[GscSearchRow] = []
    start_row = 0
    normalized_target_host = _normalize_host(config.target_site_host)

    while True:
        response = (
            service.searchanalytics()
            .query(
                siteUrl=config.property_uri,
                body=_build_request_body(config, request_date, start_row),
            )
            .execute()
        )
        raw_rows = response.get("rows", [])

        if not raw_rows:
            break

        normalized_rows = [
            _normalize_row(row)
            for row in raw_rows
            if _normalize_host(str(row.get("keys", ["", "", ""])[1]))
            == normalized_target_host
        ]
        rows.extend(normalized_rows)

        if len(raw_rows) < config.row_limit:
            break

        start_row += config.row_limit

    return rows
