"""Runtime configuration parsing for the Search Console fetch job."""

from __future__ import annotations

import argparse
import os
from dataclasses import asdict
from datetime import UTC, date, datetime, timedelta
from zoneinfo import ZoneInfo

from jobs.fetch_gsc.models import FetchGscConfig

JST = ZoneInfo("Asia/Tokyo")


def _read_env(key: str, *, required: bool = False, default: str | None = None) -> str:
    value = os.getenv(key, default or "").strip()
    if required and not value:
        raise ValueError(f"Missing required environment variable: {key}")
    return value


def _parse_date(value: str) -> date:
    return date.fromisoformat(value)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Fetch daily Search Console rows.")
    parser.add_argument("--start-date", help="Inclusive YYYY-MM-DD start date.")
    parser.add_argument("--end-date", help="Inclusive YYYY-MM-DD end date.")
    parser.add_argument(
        "--days",
        type=int,
        default=3,
        help="Trailing JST day window when explicit dates are not provided.",
    )
    parser.add_argument(
        "--row-limit",
        type=int,
        default=25_000,
        help="Maximum rows per Search Console API page.",
    )
    parser.add_argument(
        "--search-type",
        default="web",
        help="Search type passed to Search Console API.",
    )
    parser.add_argument(
        "--skip-bigquery-write",
        action="store_true",
        help="Skip BigQuery merge and only fetch rows from Search Console.",
    )
    return parser


def _get_default_date_range(days: int) -> tuple[str, str]:
    safe_days = max(1, days)
    today_jst = datetime.now(UTC).astimezone(JST).date()
    start = today_jst - timedelta(days=safe_days - 1)
    return start.isoformat(), today_jst.isoformat()


def parse_config() -> FetchGscConfig:
    """Parses CLI flags and environment variables into one config object."""

    parser = _build_parser()
    args = parser.parse_args()

    default_start_date, default_end_date = _get_default_date_range(args.days)
    start_date = args.start_date or default_start_date
    end_date = args.end_date or default_end_date

    if _parse_date(start_date) > _parse_date(end_date):
        raise ValueError("start-date must be on or before end-date")

    config = FetchGscConfig(
        property_uri=_read_env("GSC_PROPERTY_URI", required=True),
        target_site_host=_read_env("TARGET_SITE_HOST", required=True),
        start_date=start_date,
        end_date=end_date,
        row_limit=max(1, args.row_limit),
        search_type=args.search_type,
        skip_bigquery_write=args.skip_bigquery_write,
    )

    return config


def summarize_config(config: FetchGscConfig) -> dict[str, object]:
    """Returns a safe log summary of the config values."""

    return asdict(config)
