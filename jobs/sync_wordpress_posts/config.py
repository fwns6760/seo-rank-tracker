"""Runtime configuration parsing for the WordPress sync job."""

from __future__ import annotations

import argparse
import os
from dataclasses import asdict
from urllib.parse import urljoin, urlparse

from jobs.sync_wordpress_posts.app_settings_loader import (
    can_load_wordpress_settings_from_bigquery,
    load_wordpress_settings_from_bigquery,
)
from jobs.sync_wordpress_posts.models import WordPressSyncConfig


def _read_env(key: str, *, required: bool = False, default: str | None = None) -> str:
    value = os.getenv(key, default or "").strip()
    if required and not value:
        raise ValueError(f"Missing required environment variable: {key}")
    return value


def _normalize_base_url(value: str) -> str:
    parsed = urlparse(value)

    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("WORDPRESS_BASE_URL must be a valid absolute URL")

    return value.rstrip("/")


def _normalize_auth_mode(value: str) -> str:
    normalized = value.strip().lower()

    if normalized not in {"none", "basic"}:
        raise ValueError("WORDPRESS_AUTH_MODE must be either 'none' or 'basic'")

    return normalized


def _pick_first_non_empty(
    *candidates: tuple[str | None, str],
) -> tuple[str | None, str]:
    for value, source in candidates:
        if value and value.strip():
            return value.strip(), source

    return None, "unset"


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sync WordPress post metadata.")
    parser.add_argument("--base-url", help="Canonical WordPress site URL.")
    parser.add_argument(
        "--post-type",
        help="REST API endpoint slug for the post type to sync.",
    )
    parser.add_argument(
        "--statuses",
        help="Comma-separated WordPress post statuses to fetch.",
    )
    parser.add_argument(
        "--page-size",
        type=int,
        default=int(_read_env("WORDPRESS_PAGE_SIZE", default="100") or "100"),
        help="Number of posts per REST API page, max 100.",
    )
    parser.add_argument(
        "--max-pages",
        type=int,
        help="Optional maximum number of pages to fetch for smoke runs.",
    )
    parser.add_argument(
        "--request-timeout-seconds",
        type=int,
        default=int(_read_env("WORDPRESS_REQUEST_TIMEOUT_SECONDS", default="30") or "30"),
        help="HTTP request timeout in seconds.",
    )
    parser.add_argument(
        "--user-agent",
        default=_read_env(
            "WORDPRESS_USER_AGENT",
            default="seo-rank-tracker-wordpress-sync/1.0",
        )
        or "seo-rank-tracker-wordpress-sync/1.0",
        help="User-Agent header for REST API requests.",
    )
    parser.add_argument(
        "--skip-bigquery-write",
        action="store_true",
        help="Fetch posts only and skip the BigQuery merge.",
    )
    return parser


def parse_config() -> WordPressSyncConfig:
    """Parses CLI flags and environment variables into one config object."""

    parser = _build_parser()
    args = parser.parse_args()
    app_settings: dict[str, str] = {}
    app_settings_error: Exception | None = None

    if can_load_wordpress_settings_from_bigquery():
        try:
            app_settings = load_wordpress_settings_from_bigquery()
        except Exception as error:  # pragma: no cover - exercised via config behavior
            app_settings_error = error

    base_url_raw, base_url_source = _pick_first_non_empty(
        (args.base_url, "cli"),
        (_read_env("WORDPRESS_BASE_URL"), "env"),
        (app_settings.get("wordpress_base_url"), "app_settings"),
    )

    if not base_url_raw:
        if app_settings_error is not None:
            raise ValueError(
                "WORDPRESS_BASE_URL is required and app_settings fallback could not be loaded"
            ) from app_settings_error

        raise ValueError("Missing required WordPress configuration: WORDPRESS_BASE_URL")

    base_url = _normalize_base_url(base_url_raw)
    post_type, post_type_source = _pick_first_non_empty(
        (args.post_type, "cli"),
        (_read_env("WORDPRESS_POST_TYPE"), "env"),
        (app_settings.get("wordpress_post_type"), "app_settings"),
        ("posts", "default"),
    )
    statuses_value, statuses_source = _pick_first_non_empty(
        (args.statuses, "cli"),
        (_read_env("WORDPRESS_POST_STATUSES"), "env"),
        (app_settings.get("wordpress_post_statuses"), "app_settings"),
        ("publish", "default"),
    )
    auth_username, auth_username_source = _pick_first_non_empty(
        (_read_env("WORDPRESS_USERNAME"), "env"),
        (app_settings.get("wordpress_username"), "app_settings"),
    )
    secret_name, secret_name_source = _pick_first_non_empty(
        (_read_env("WORDPRESS_APPLICATION_PASSWORD_SECRET_NAME"), "env"),
        (
            app_settings.get("wordpress_application_password_secret_name"),
            "app_settings",
        ),
    )
    auth_application_password = _read_env("WORDPRESS_APPLICATION_PASSWORD") or None
    auth_application_password_source = (
        "env" if auth_application_password else "unset"
    )
    auth_mode_raw, auth_mode_source = _pick_first_non_empty(
        (_read_env("WORDPRESS_AUTH_MODE"), "env"),
        (app_settings.get("wordpress_auth_mode"), "app_settings"),
    )

    if auth_mode_raw:
        auth_mode = _normalize_auth_mode(auth_mode_raw)
    elif auth_username and auth_application_password:
        auth_mode = "basic"
        auth_mode_source = "inferred_from_credentials"
    else:
        auth_mode = "none"
        auth_mode_source = "default"

    if auth_mode == "basic":
        if not auth_username:
            raise ValueError(
                "WORDPRESS_USERNAME or app_settings.wordpress_username is required when WordPress auth mode is basic"
            )

        if not auth_application_password:
            raise ValueError(
                "WORDPRESS_APPLICATION_PASSWORD must be injected at runtime when WordPress auth mode is basic"
            )
    else:
        auth_username = None
        auth_application_password = None

    statuses = tuple(
        status.strip()
        for status in (statuses_value or "").split(",")
        if status.strip()
    )

    if not statuses:
        raise ValueError("At least one WordPress status must be provided")

    parsed_base_url = urlparse(base_url)

    return WordPressSyncConfig(
        base_url=base_url,
        api_base_url=urljoin(f"{base_url}/", "wp-json/wp/v2/"),
        target_site_host=parsed_base_url.netloc.lower(),
        post_type=(post_type or "posts").strip() or "posts",
        auth_mode=auth_mode,
        statuses=statuses,
        page_size=max(1, min(100, args.page_size)),
        request_timeout_seconds=max(1, args.request_timeout_seconds),
        user_agent=args.user_agent.strip() or "seo-rank-tracker-wordpress-sync/1.0",
        auth_username=auth_username,
        auth_application_password=auth_application_password,
        auth_application_password_secret_name=secret_name or None,
        skip_bigquery_write=args.skip_bigquery_write,
        max_pages=max(1, args.max_pages) if args.max_pages else None,
        config_sources={
            "base_url": base_url_source,
            "post_type": post_type_source,
            "statuses": statuses_source,
            "auth_mode": auth_mode_source,
            "auth_username": auth_username_source,
            "auth_application_password": auth_application_password_source,
            "auth_application_password_secret_name": secret_name_source,
        },
    )


def summarize_config(config: WordPressSyncConfig) -> dict[str, object]:
    """Returns a safe log summary of the config values."""

    summary = asdict(config)
    summary.pop("auth_application_password", None)
    summary["statuses"] = list(config.statuses)
    return summary
