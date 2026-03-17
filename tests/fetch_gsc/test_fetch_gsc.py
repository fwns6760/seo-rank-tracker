"""Unit tests for the Search Console fetch job."""

from __future__ import annotations

from datetime import UTC, datetime
import unittest

from jobs.fetch_gsc.bigquery_writer import normalize_daily_rankings_rows
from jobs.fetch_gsc.gsc_client import fetch_daily_rows, iter_request_dates
from jobs.fetch_gsc.models import FetchGscConfig, GscSearchRow


class _FakeRequest:
    def __init__(self, response: dict):
        self._response = response

    def execute(self) -> dict:
        return self._response


class _FakeSearchAnalyticsResource:
    def __init__(self, responses: list[dict]):
        self._responses = responses
        self.calls: list[dict] = []

    def query(self, *, siteUrl: str, body: dict) -> _FakeRequest:
        self.calls.append({"siteUrl": siteUrl, "body": body})
        response = self._responses.pop(0) if self._responses else {"rows": []}
        return _FakeRequest(response)


class _FakeService:
    def __init__(self, responses: list[dict]):
        self._resource = _FakeSearchAnalyticsResource(responses)

    def searchanalytics(self) -> _FakeSearchAnalyticsResource:
        return self._resource


class FetchGscClientTests(unittest.TestCase):
    def test_iter_request_dates_returns_inclusive_dates(self) -> None:
        dates = list(iter_request_dates("2026-03-14", "2026-03-16"))
        self.assertEqual(dates, ["2026-03-14", "2026-03-15", "2026-03-16"])

    def test_fetch_daily_rows_filters_target_host_and_paginates(self) -> None:
        service = _FakeService(
            responses=[
                {
                    "rows": [
                        {
                            "keys": [
                                "2026-03-14",
                                "https://prosports.yoshilover.com/page-a",
                                "family keyword",
                            ],
                            "clicks": 10,
                            "impressions": 100,
                            "ctr": 0.1,
                            "position": 3.2,
                        }
                    ]
                },
                {
                    "rows": [
                        {
                            "keys": [
                                "2026-03-14",
                                "https://www.yoshilover.com/page-b",
                                "wrong host keyword",
                            ],
                            "clicks": 2,
                            "impressions": 50,
                            "ctr": 0.04,
                            "position": 9.8,
                        }
                    ]
                },
                {"rows": []},
            ]
        )
        config = FetchGscConfig(
            property_uri="https://prosports.yoshilover.com/",
            target_site_host="prosports.yoshilover.com",
            start_date="2026-03-14",
            end_date="2026-03-14",
            row_limit=1,
        )

        rows = fetch_daily_rows(service, config, "2026-03-14")

        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0].page, "https://prosports.yoshilover.com/page-a")
        self.assertEqual(rows[0].query, "family keyword")
        self.assertAlmostEqual(rows[0].position, 3.2)
        self.assertEqual(len(service.searchanalytics().calls), 3)

    def test_normalize_daily_rankings_rows_deduplicates_keys(self) -> None:
        fetched_at = datetime(2026, 3, 16, tzinfo=UTC).isoformat()
        rows = [
            GscSearchRow(
                date="2026-03-14",
                page="https://prosports.yoshilover.com/page-a",
                query="family keyword",
                clicks=10.0,
                impressions=100.0,
                ctr=0.1,
                position=3.2,
            ),
            GscSearchRow(
                date="2026-03-14",
                page="https://prosports.yoshilover.com/page-a",
                query="family keyword",
                clicks=12.0,
                impressions=120.0,
                ctr=0.1,
                position=2.8,
            ),
        ]

        normalized_rows, skipped_rows = normalize_daily_rankings_rows(
            rows,
            "20260316-fetch-gsc-000001-abcd",
            fetched_at,
        )

        self.assertEqual(len(normalized_rows), 1)
        self.assertEqual(skipped_rows, 1)
        self.assertEqual(normalized_rows[0]["source"], "gsc")
        self.assertEqual(normalized_rows[0]["execution_id"], "20260316-fetch-gsc-000001-abcd")
        self.assertEqual(normalized_rows[0]["impressions"], 120)
        self.assertEqual(normalized_rows[0]["scrape_position"], None)


if __name__ == "__main__":
    unittest.main()
