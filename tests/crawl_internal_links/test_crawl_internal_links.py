from __future__ import annotations

import unittest

from jobs.crawl_internal_links.crawler import (
    crawl_internal_links,
    extract_internal_links,
    normalize_internal_url,
)
from jobs.crawl_internal_links.models import CrawlInternalLinksConfig


class CrawlInternalLinksTests(unittest.TestCase):
    def test_normalize_internal_url_keeps_same_host_and_removes_fragment(self) -> None:
        normalized = normalize_internal_url(
            "/article#intro",
            "https://prosports.yoshilover.com/",
            "prosports.yoshilover.com",
        )

        self.assertEqual(normalized, "https://prosports.yoshilover.com/article")

    def test_extract_internal_links_ignores_external_links(self) -> None:
        html = """
        <html><body>
          <a href="/article-1">Article One</a>
          <a href="https://prosports.yoshilover.com/article-2#summary">Article Two</a>
          <a href="https://example.com/">External</a>
        </body></html>
        """

        links = extract_internal_links(
            html,
            "https://prosports.yoshilover.com/",
            "prosports.yoshilover.com",
        )

        self.assertEqual(
            links,
            [
                ("https://prosports.yoshilover.com/article-1", "Article One"),
                ("https://prosports.yoshilover.com/article-2", "Article Two"),
            ],
        )

    def test_crawl_internal_links_collects_edges_and_404_statuses(self) -> None:
        responses = {
            "https://prosports.yoshilover.com/": (
                200,
                "text/html; charset=utf-8",
                """
                <a href="/article-1">Article One</a>
                <a href="/missing">Broken Link</a>
                """,
            ),
            "https://prosports.yoshilover.com/article-1": (
                200,
                "text/html; charset=utf-8",
                """
                <a href="/">Home</a>
                """,
            ),
            "https://prosports.yoshilover.com/missing": (
                404,
                "text/html; charset=utf-8",
                None,
            ),
        }

        config = CrawlInternalLinksConfig(
            target_site_host="prosports.yoshilover.com",
            start_url="https://prosports.yoshilover.com/",
            max_pages=10,
            request_timeout_seconds=15,
            user_agent="test-agent",
            skip_bigquery_write=True,
        )

        result = crawl_internal_links(config, fetcher=lambda url: responses[url])

        self.assertEqual(result.crawled_pages, 3)
        self.assertEqual(result.discovered_targets, 3)
        self.assertEqual(result.broken_links, 1)
        self.assertEqual(
            [(row.source_url, row.target_url, row.anchor_text, row.status_code) for row in result.rows],
            [
                (
                    "https://prosports.yoshilover.com/",
                    "https://prosports.yoshilover.com/article-1",
                    "Article One",
                    200,
                ),
                (
                    "https://prosports.yoshilover.com/",
                    "https://prosports.yoshilover.com/missing",
                    "Broken Link",
                    404,
                ),
                (
                    "https://prosports.yoshilover.com/article-1",
                    "https://prosports.yoshilover.com/",
                    "Home",
                    200,
                ),
            ],
        )


if __name__ == "__main__":
    unittest.main()
