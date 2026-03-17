"""Unit tests for the WordPress sync job."""

from __future__ import annotations

from datetime import UTC, datetime
import os
import unittest
from unittest.mock import patch

from jobs.sync_wordpress_posts.bigquery_writer import normalize_wp_posts_rows
from jobs.sync_wordpress_posts.client import (
    estimate_word_count,
    fetch_wordpress_posts,
    hash_content,
    strip_html_to_text,
)
from jobs.sync_wordpress_posts.config import parse_config
from jobs.sync_wordpress_posts.models import WordPressPostRecord, WordPressSyncConfig


class _FakeResponse:
    def __init__(self, payload: list[dict], headers: dict[str, str] | None = None):
        self._payload = payload
        self.headers = headers or {}

    def json(self) -> list[dict]:
        return self._payload

    def raise_for_status(self) -> None:
        return None


class _FakeSession:
    def __init__(self, responses: dict[tuple[str, int], _FakeResponse]):
        self._responses = responses
        self.calls: list[tuple[str, dict]] = []

    def get(self, url: str, *, params: dict, timeout: int) -> _FakeResponse:
        self.calls.append((url, params))
        page = int(params.get("page", 1))
        return self._responses[(url, page)]


class WordPressSyncTests(unittest.TestCase):
    def test_strip_html_to_text_and_hash_content(self) -> None:
        html = "<p>Hello <strong>World</strong></p>"

        self.assertEqual(strip_html_to_text(html), "Hello World")
        self.assertIsNotNone(hash_content(html))
        self.assertEqual(estimate_word_count(html), 2)

    def test_fetch_wordpress_posts_paginates_and_maps_taxonomies(self) -> None:
        config = WordPressSyncConfig(
            base_url="https://prosports.yoshilover.com",
            api_base_url="https://prosports.yoshilover.com/wp-json/wp/v2/",
            target_site_host="prosports.yoshilover.com",
            post_type="posts",
            statuses=("publish",),
            page_size=1,
            request_timeout_seconds=30,
        )
        responses = {
            (
                "https://prosports.yoshilover.com/wp-json/wp/v2/categories",
                1,
            ): _FakeResponse(
                [{"id": 10, "name": "MLB"}],
                headers={"X-WP-TotalPages": "1"},
            ),
            (
                "https://prosports.yoshilover.com/wp-json/wp/v2/tags",
                1,
            ): _FakeResponse(
                [{"id": 20, "name": "Shohei Ohtani"}],
                headers={"X-WP-TotalPages": "1"},
            ),
            (
                "https://prosports.yoshilover.com/wp-json/wp/v2/posts",
                1,
            ): _FakeResponse(
                [
                    {
                        "id": 100,
                        "link": "https://prosports.yoshilover.com/sample-post/",
                        "slug": "sample-post",
                        "title": {"rendered": "Sample Post"},
                        "status": "publish",
                        "type": "posts",
                        "date_gmt": "2026-03-15T01:00:00",
                        "modified_gmt": "2026-03-16T02:30:00",
                        "categories": [10],
                        "tags": [20],
                        "content": {"rendered": "<p>Shohei Ohtani sample article</p>"},
                    }
                ],
                headers={"X-WP-TotalPages": "1"},
            ),
        }

        posts = fetch_wordpress_posts(_FakeSession(responses), config)

        self.assertEqual(len(posts), 1)
        self.assertEqual(posts[0].wp_post_id, 100)
        self.assertEqual(posts[0].categories, ["MLB"])
        self.assertEqual(posts[0].tags, ["Shohei Ohtani"])
        self.assertEqual(posts[0].slug, "sample-post")
        self.assertEqual(posts[0].post_status, "publish")

    def test_normalize_wp_posts_rows_deduplicates_post_ids(self) -> None:
        fetched_at = datetime(2026, 3, 16, tzinfo=UTC).isoformat()
        rows = [
            WordPressPostRecord(
                wp_post_id=10,
                url="https://prosports.yoshilover.com/a/",
                slug="a",
                title="A",
                post_type="posts",
                post_status="publish",
                published_at="2026-03-15T00:00:00+00:00",
                modified_at="2026-03-16T00:00:00+00:00",
                categories=["MLB"],
                tags=["Tag A"],
                content_hash="hash-a",
                word_count=100,
            ),
            WordPressPostRecord(
                wp_post_id=10,
                url="https://prosports.yoshilover.com/a-updated/",
                slug="a-updated",
                title="A Updated",
                post_type="posts",
                post_status="publish",
                published_at="2026-03-15T00:00:00+00:00",
                modified_at="2026-03-16T01:00:00+00:00",
                categories=["MLB"],
                tags=["Tag A"],
                content_hash="hash-b",
                word_count=120,
            ),
        ]

        normalized_rows, skipped_rows = normalize_wp_posts_rows(
            rows,
            "20260316-sync-wordpress-posts-000001-abcd",
            fetched_at,
        )

        self.assertEqual(len(normalized_rows), 1)
        self.assertEqual(skipped_rows, 1)
        self.assertEqual(normalized_rows[0]["slug"], "a-updated")
        self.assertEqual(normalized_rows[0]["execution_id"], "20260316-sync-wordpress-posts-000001-abcd")

    def test_parse_config_uses_app_settings_when_env_is_missing(self) -> None:
        with patch.dict(
            os.environ,
            {
                "GOOGLE_CLOUD_PROJECT": "baseballsite",
                "BIGQUERY_DATASET": "seo_rank_tracker",
                "BIGQUERY_LOCATION": "asia-northeast1",
            },
            clear=True,
        ):
            with patch(
                "jobs.sync_wordpress_posts.config.load_wordpress_settings_from_bigquery",
                return_value={
                    "wordpress_base_url": "https://prosports.yoshilover.com",
                    "wordpress_auth_mode": "none",
                    "wordpress_post_type": "posts",
                    "wordpress_post_statuses": "publish,draft",
                },
            ):
                with patch("sys.argv", ["sync_wordpress_posts"]):
                    config = parse_config()

        self.assertEqual(config.base_url, "https://prosports.yoshilover.com")
        self.assertEqual(config.post_type, "posts")
        self.assertEqual(config.statuses, ("publish", "draft"))
        self.assertEqual(config.auth_mode, "none")
        self.assertIsNone(config.auth_username)
        self.assertEqual(config.config_sources["base_url"], "app_settings")
        self.assertEqual(config.config_sources["statuses"], "app_settings")

    def test_parse_config_prefers_cli_and_env_over_app_settings(self) -> None:
        with patch.dict(
            os.environ,
            {
                "GOOGLE_CLOUD_PROJECT": "baseballsite",
                "BIGQUERY_DATASET": "seo_rank_tracker",
                "BIGQUERY_LOCATION": "asia-northeast1",
                "WORDPRESS_BASE_URL": "https://env.yoshilover.com",
                "WORDPRESS_POST_STATUSES": "publish",
            },
            clear=True,
        ):
            with patch(
                "jobs.sync_wordpress_posts.config.load_wordpress_settings_from_bigquery",
                return_value={
                    "wordpress_base_url": "https://settings.yoshilover.com",
                    "wordpress_post_type": "posts",
                    "wordpress_post_statuses": "draft",
                },
            ):
                with patch(
                    "sys.argv",
                    ["sync_wordpress_posts", "--post-type", "stories"],
                ):
                    config = parse_config()

        self.assertEqual(config.base_url, "https://env.yoshilover.com")
        self.assertEqual(config.post_type, "stories")
        self.assertEqual(config.statuses, ("publish",))
        self.assertEqual(config.config_sources["base_url"], "env")
        self.assertEqual(config.config_sources["post_type"], "cli")
        self.assertEqual(config.config_sources["statuses"], "env")

    def test_parse_config_requires_runtime_password_for_basic_auth(self) -> None:
        with patch.dict(
            os.environ,
            {
                "GOOGLE_CLOUD_PROJECT": "baseballsite",
                "BIGQUERY_DATASET": "seo_rank_tracker",
                "BIGQUERY_LOCATION": "asia-northeast1",
            },
            clear=True,
        ):
            with patch(
                "jobs.sync_wordpress_posts.config.load_wordpress_settings_from_bigquery",
                return_value={
                    "wordpress_base_url": "https://prosports.yoshilover.com",
                    "wordpress_auth_mode": "basic",
                    "wordpress_username": "editor@example.com",
                    "wordpress_application_password_secret_name": "projects/baseballsite/secrets/wp-password",
                    "wordpress_post_type": "posts",
                    "wordpress_post_statuses": "publish",
                },
            ):
                with patch("sys.argv", ["sync_wordpress_posts"]):
                    with self.assertRaisesRegex(
                        ValueError,
                        "WORDPRESS_APPLICATION_PASSWORD must be injected at runtime",
                    ):
                        parse_config()


if __name__ == "__main__":
    unittest.main()
