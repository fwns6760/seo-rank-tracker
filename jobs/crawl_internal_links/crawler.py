"""HTML crawling helpers for internal-link analysis."""

from __future__ import annotations

from collections import deque
from html.parser import HTMLParser
from typing import Callable
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlsplit, urlunsplit
from urllib.request import Request, urlopen

from jobs.crawl_internal_links.models import (
    CrawlInternalLinksConfig,
    InternalLinkRecord,
    InternalLinksCrawlResult,
)

COMMON_BINARY_EXTENSIONS = (
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".svg",
    ".webp",
    ".ico",
    ".pdf",
    ".zip",
    ".xml",
    ".json",
    ".mp4",
    ".mp3",
)


def normalize_internal_url(candidate: str, base_url: str, target_site_host: str) -> str | None:
    """Normalizes one candidate URL and keeps only same-host HTTP(S) links."""

    resolved = urljoin(base_url, candidate)
    parsed = urlsplit(resolved)

    if parsed.scheme not in {"http", "https"}:
        return None

    if parsed.netloc.lower() != target_site_host.lower():
        return None

    normalized = urlunsplit(
        (
            parsed.scheme.lower(),
            parsed.netloc.lower(),
            parsed.path or "/",
            parsed.query,
            "",
        )
    )

    return normalized


class AnchorParser(HTMLParser):
    """Extracts anchor hrefs and anchor text from one HTML document."""

    def __init__(self, base_url: str, target_site_host: str) -> None:
        super().__init__(convert_charrefs=True)
        self.base_url = base_url
        self.target_site_host = target_site_host
        self.current_href: str | None = None
        self.current_text: list[str] = []
        self.links: list[tuple[str, str | None]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() != "a":
            return

        href = dict(attrs).get("href")

        if href:
            self.current_href = href
            self.current_text = []

    def handle_data(self, data: str) -> None:
        if self.current_href is not None:
            self.current_text.append(data)

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() != "a" or self.current_href is None:
            return

        normalized = normalize_internal_url(
            self.current_href,
            self.base_url,
            self.target_site_host,
        )
        anchor_text = " ".join(part.strip() for part in self.current_text).strip() or None

        if normalized:
            self.links.append((normalized, anchor_text))

        self.current_href = None
        self.current_text = []


def extract_internal_links(html: str, base_url: str, target_site_host: str) -> list[tuple[str, str | None]]:
    """Extracts normalized same-host links from one HTML document."""

    parser = AnchorParser(base_url, target_site_host)
    parser.feed(html)
    return parser.links


def should_follow_target(target_url: str) -> bool:
    """Returns whether one target URL should be crawled as an HTML source page."""

    lower = target_url.lower()
    return not lower.endswith(COMMON_BINARY_EXTENSIONS)


def fetch_url(url: str, *, timeout_seconds: int, user_agent: str) -> tuple[int | None, str | None, str | None]:
    """Fetches one URL and returns status code, content type, and decoded body when available."""

    request = Request(url, headers={"User-Agent": user_agent})

    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            status_code = getattr(response, "status", None)
            content_type = response.headers.get("Content-Type")
            body = response.read()
            decoded = body.decode("utf-8", errors="replace")
            return status_code, content_type, decoded
    except HTTPError as error:
        return error.code, error.headers.get("Content-Type"), None
    except URLError:
        return None, None, None


def is_html_response(status_code: int | None, content_type: str | None) -> bool:
    """Returns whether the fetched response should be parsed as HTML."""

    return status_code is not None and 200 <= status_code < 400 and bool(content_type) and "text/html" in content_type.lower()


def crawl_internal_links(
    config: CrawlInternalLinksConfig,
    *,
    fetcher: Callable[[str], tuple[int | None, str | None, str | None]] | None = None,
) -> InternalLinksCrawlResult:
    """Crawls same-host pages and returns deduped internal-link edges."""

    run_fetch = fetcher or (
        lambda url: fetch_url(
            url,
            timeout_seconds=config.request_timeout_seconds,
            user_agent=config.user_agent,
        )
    )

    visited_pages: set[str] = set()
    enqueued_pages = {config.start_url}
    page_status_by_url: dict[str, int | None] = {}
    queued_pages = deque([config.start_url])
    deduped_edges: dict[tuple[str, str, str | None], InternalLinkRecord] = {}

    while queued_pages and len(visited_pages) < config.max_pages:
        source_url = queued_pages.popleft()

        if source_url in visited_pages:
            continue

        visited_pages.add(source_url)
        status_code, content_type, body = run_fetch(source_url)
        page_status_by_url[source_url] = status_code

        if not is_html_response(status_code, content_type) or body is None:
            continue

        for target_url, anchor_text in extract_internal_links(
            body,
            source_url,
            config.target_site_host,
        ):
            dedupe_key = (source_url, target_url, anchor_text)
            deduped_edges[dedupe_key] = InternalLinkRecord(
                source_url=source_url,
                target_url=target_url,
                anchor_text=anchor_text,
                status_code=None,
            )

            if (
                target_url not in visited_pages
                and target_url not in enqueued_pages
                and should_follow_target(target_url)
                and len(visited_pages) + len(queued_pages) < config.max_pages
            ):
                queued_pages.append(target_url)
                enqueued_pages.add(target_url)

    for target_url in {row.target_url for row in deduped_edges.values()}:
        if target_url in page_status_by_url:
            continue

        status_code, _, _ = run_fetch(target_url)
        page_status_by_url[target_url] = status_code

    rows = [
        InternalLinkRecord(
            source_url=row.source_url,
            target_url=row.target_url,
            anchor_text=row.anchor_text,
            status_code=page_status_by_url.get(row.target_url),
        )
        for row in deduped_edges.values()
    ]
    broken_links = sum(1 for row in rows if row.status_code == 404)

    return InternalLinksCrawlResult(
        rows=sorted(
            rows,
            key=lambda row: (
                row.source_url,
                row.target_url,
                row.anchor_text or "",
            ),
        ),
        crawled_pages=len(visited_pages),
        discovered_targets=len({row.target_url for row in rows}),
        broken_links=broken_links,
    )
