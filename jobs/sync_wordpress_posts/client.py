"""WordPress REST API client helpers."""

from __future__ import annotations

import hashlib
import html
import re
from datetime import UTC, datetime
from typing import Any
from urllib.parse import urljoin

import requests

from jobs.sync_wordpress_posts.models import WordPressPostRecord, WordPressSyncConfig

TAG_RE = re.compile(r"<[^>]+>")
WORD_RE = re.compile(r"[A-Za-z0-9_]+|[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]+")


def build_wordpress_session(config: WordPressSyncConfig) -> requests.Session:
    """Builds one configured requests session for the WordPress API."""

    session = requests.Session()
    session.headers.update(
        {
            "Accept": "application/json",
            "User-Agent": config.user_agent,
        }
    )

    if (
        config.auth_mode == "basic"
        and config.auth_username
        and config.auth_application_password
    ):
        session.auth = (config.auth_username, config.auth_application_password)

    return session


def strip_html_to_text(value: str) -> str:
    """Converts rendered HTML to normalized plain text."""

    without_tags = TAG_RE.sub(" ", value or "")
    unescaped = html.unescape(without_tags)
    return re.sub(r"\s+", " ", unescaped).strip()


def hash_content(value: str) -> str | None:
    """Returns a stable SHA-256 hash for non-empty rendered content."""

    normalized = strip_html_to_text(value)

    if not normalized:
        return None

    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def estimate_word_count(value: str) -> int | None:
    """Returns a coarse content token count for editorial comparisons."""

    normalized = strip_html_to_text(value)

    if not normalized:
        return None

    return len(WORD_RE.findall(normalized))


def normalize_timestamp(value: str | None) -> str | None:
    """Normalizes a WordPress date string to ISO-8601 UTC."""

    if not value or value.startswith("0000-00-00"):
        return None

    candidate = value.strip()

    if candidate.endswith("Z"):
        candidate = candidate.replace("Z", "+00:00")
    elif len(candidate) == 19:
        candidate = f"{candidate}+00:00"

    parsed = datetime.fromisoformat(candidate)

    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=UTC)

    return parsed.astimezone(UTC).isoformat()


def _request_page(
    session: requests.Session,
    url: str,
    *,
    params: dict[str, Any],
    timeout: int,
) -> tuple[list[dict[str, Any]], int]:
    response = session.get(url, params=params, timeout=timeout)
    response.raise_for_status()
    total_pages = int(response.headers.get("X-WP-TotalPages", "1") or "1")
    payload = response.json()

    if not isinstance(payload, list):
        raise ValueError(f"Expected list response from {url}")

    return payload, total_pages


def fetch_taxonomy_map(
    session: requests.Session,
    config: WordPressSyncConfig,
    taxonomy: str,
) -> dict[int, str]:
    """Fetches one taxonomy dictionary keyed by term ID."""

    taxonomy_url = urljoin(config.api_base_url, taxonomy)
    term_names: dict[int, str] = {}
    page = 1
    total_pages = 1

    while page <= total_pages:
        rows, total_pages = _request_page(
            session,
            taxonomy_url,
            params={
                "page": page,
                "per_page": 100,
                "_fields": "id,name",
            },
            timeout=config.request_timeout_seconds,
        )

        for row in rows:
            term_id = row.get("id")
            name = str(row.get("name", "")).strip()

            if isinstance(term_id, int) and name:
                term_names[term_id] = name

        page += 1

    return term_names


def _map_terms(ids: list[int], taxonomy_map: dict[int, str], prefix: str) -> list[str]:
    mapped: list[str] = []

    for raw_id in ids:
        if raw_id in taxonomy_map:
            mapped.append(taxonomy_map[raw_id])
        else:
            mapped.append(f"{prefix}:{raw_id}")

    return mapped


def normalize_post(
    row: dict[str, Any],
    *,
    category_map: dict[int, str],
    tag_map: dict[int, str],
) -> WordPressPostRecord:
    """Maps one raw REST API row to the canonical post schema."""

    wp_post_id = int(row["id"])
    title = strip_html_to_text(str(row.get("title", {}).get("rendered", ""))) or None
    content_html = str(row.get("content", {}).get("rendered", ""))
    category_ids = [int(value) for value in row.get("categories", []) if isinstance(value, int)]
    tag_ids = [int(value) for value in row.get("tags", []) if isinstance(value, int)]

    return WordPressPostRecord(
        wp_post_id=wp_post_id,
        url=str(row.get("link", "")).strip(),
        slug=str(row.get("slug", "")).strip(),
        title=title,
        post_type=str(row.get("type", "")).strip() or "posts",
        post_status=str(row.get("status", "")).strip() or "publish",
        published_at=normalize_timestamp(
            str(row.get("date_gmt", "")).strip() or str(row.get("date", "")).strip()
        ),
        modified_at=normalize_timestamp(
            str(row.get("modified_gmt", "")).strip()
            or str(row.get("modified", "")).strip()
        ),
        categories=_map_terms(category_ids, category_map, "category"),
        tags=_map_terms(tag_ids, tag_map, "tag"),
        content_hash=hash_content(content_html),
        word_count=estimate_word_count(content_html),
    )


def fetch_wordpress_posts(
    session: requests.Session,
    config: WordPressSyncConfig,
) -> list[WordPressPostRecord]:
    """Fetches and normalizes WordPress post metadata with pagination."""

    posts_url = urljoin(config.api_base_url, config.post_type)
    category_map = fetch_taxonomy_map(session, config, "categories")
    tag_map = fetch_taxonomy_map(session, config, "tags")
    posts: list[WordPressPostRecord] = []
    page = 1
    total_pages = 1

    while page <= total_pages:
        if config.max_pages and page > config.max_pages:
            break

        rows, total_pages = _request_page(
            session,
            posts_url,
            params={
                "page": page,
                "per_page": config.page_size,
                "status": ",".join(config.statuses),
                "_fields": ",".join(
                    [
                        "id",
                        "link",
                        "slug",
                        "title.rendered",
                        "status",
                        "type",
                        "date",
                        "date_gmt",
                        "modified",
                        "modified_gmt",
                        "categories",
                        "tags",
                        "content.rendered",
                    ]
                ),
            },
            timeout=config.request_timeout_seconds,
        )

        if not rows:
            break

        posts.extend(
            normalize_post(
                row,
                category_map=category_map,
                tag_map=tag_map,
            )
            for row in rows
        )
        page += 1

    return posts
