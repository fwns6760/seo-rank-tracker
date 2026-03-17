"""Runtime configuration for the internal-links crawl job."""

from __future__ import annotations

import argparse
import os
from dataclasses import asdict
from urllib.parse import urlparse

from jobs.crawl_internal_links.models import CrawlInternalLinksConfig


def _read_env(key: str, *, required: bool = False, default: str | None = None) -> str:
    value = os.getenv(key, default or "").strip()
    if required and not value:
        raise ValueError(f"Missing required environment variable: {key}")
    return value


def _normalize_start_url(target_site_host: str, explicit_start_url: str) -> str:
    candidate = explicit_start_url.strip() or f"https://{target_site_host}/"
    parsed = urlparse(candidate)

    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("start-url must be an absolute http(s) URL")

    return candidate


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Crawl internal links from one site.")
    parser.add_argument("--start-url", help="Absolute URL to start the crawl from.")
    parser.add_argument(
        "--max-pages",
        type=int,
        default=40,
        help="Maximum number of HTML pages to crawl per execution.",
    )
    parser.add_argument(
        "--request-timeout-seconds",
        type=int,
        default=15,
        help="Per-request timeout in seconds.",
    )
    parser.add_argument(
        "--user-agent",
        help="Optional user agent override for crawl requests.",
    )
    parser.add_argument(
        "--skip-bigquery-write",
        action="store_true",
        help="Skip BigQuery merge and only crawl internal links.",
    )
    return parser


def parse_config() -> CrawlInternalLinksConfig:
    """Parses CLI flags and environment variables into one config object."""

    parser = _build_parser()
    args = parser.parse_args()

    target_site_host = _read_env("TARGET_SITE_HOST", required=True)
    start_url = _normalize_start_url(
        target_site_host,
        args.start_url or _read_env("INTERNAL_LINKS_START_URL"),
    )
    user_agent = (
        args.user_agent
        or _read_env("INTERNAL_LINKS_USER_AGENT")
        or f"SEO Rank Tracker Internal Link Crawler/0.1 (+https://{target_site_host}/)"
    )

    return CrawlInternalLinksConfig(
        target_site_host=target_site_host,
        start_url=start_url,
        max_pages=max(1, args.max_pages),
        request_timeout_seconds=max(1, args.request_timeout_seconds),
        user_agent=user_agent,
        skip_bigquery_write=args.skip_bigquery_write,
    )


def summarize_config(config: CrawlInternalLinksConfig) -> dict[str, object]:
    """Returns a safe summary of crawl config values for logs."""

    return asdict(config)
