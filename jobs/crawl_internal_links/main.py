"""CLI entrypoint for the internal-links crawl job."""

from __future__ import annotations

import os
from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from jobs.crawl_internal_links.bigquery_writer import upsert_internal_links
from jobs.crawl_internal_links.config import parse_config, summarize_config
from jobs.crawl_internal_links.crawler import crawl_internal_links
from jobs.fetch_gsc.logging_utils import JobLogger

JST = ZoneInfo("Asia/Tokyo")


def main() -> int:
    """Runs the internal-links crawl job and emits structured logs."""

    started_at = datetime.now(UTC)
    bootstrap_logger = JobLogger.create(
        job_name="crawl_internal_links",
        target_site=os.getenv("TARGET_SITE_HOST", "unknown"),
        execution_id=os.getenv("EXECUTION_ID"),
    )

    try:
        config = parse_config()
    except Exception as error:
        bootstrap_logger.error(
            message="Failed to load crawl_internal_links configuration",
            failed_step="parse_config",
            recoverable=False,
            error=error,
        )
        return 1

    logger = JobLogger(
        execution_id=bootstrap_logger.execution_id,
        job_name=bootstrap_logger.job_name,
        target_site=config.target_site_host,
        started_at=bootstrap_logger.started_at,
    )

    logger.job(
        status="started",
        message="Internal-links crawl job started",
        extra={"input_summary": summarize_config(config)},
    )

    try:
        logger.step(
            step="crawl_site",
            step_status="started",
            message="Crawling same-host pages and extracting internal links",
        )
        crawl_result = crawl_internal_links(config)
        logger.step(
            step="crawl_site",
            step_status="success",
            message="Internal links extracted",
            output_summary={
                "crawled_pages": crawl_result.crawled_pages,
                "discovered_targets": crawl_result.discovered_targets,
                "fetched_row_count": len(crawl_result.rows),
                "broken_links": crawl_result.broken_links,
            },
        )
    except Exception as error:
        logger.error(
            message="Failed to crawl internal links",
            failed_step="crawl_site",
            recoverable=False,
            error=error,
        )
        return 1

    inserted_rows = 0
    updated_rows = 0
    skipped_rows = 0
    crawl_date = started_at.astimezone(JST).date().isoformat()

    if not config.skip_bigquery_write:
        try:
            logger.step(
                step="insert_bigquery",
                step_status="started",
                message="Upserting internal_links rows into BigQuery",
                input_summary={
                    "fetched_row_count": len(crawl_result.rows),
                    "crawl_date": crawl_date,
                },
            )
            write_result = upsert_internal_links(
                crawl_result.rows,
                logger.execution_id,
                crawl_date,
            )
            inserted_rows = write_result.inserted_rows
            updated_rows = write_result.updated_rows
            skipped_rows = write_result.skipped_rows
            logger.step(
                step="insert_bigquery",
                step_status="success",
                message="BigQuery upsert finished",
                output_summary={
                    "fetched_rows": write_result.fetched_rows,
                    "inserted_rows": write_result.inserted_rows,
                    "updated_rows": write_result.updated_rows,
                    "skipped_rows": write_result.skipped_rows,
                },
            )
        except Exception as error:
            logger.error(
                message="Failed to upsert internal_links rows into BigQuery",
                failed_step="insert_bigquery",
                recoverable=False,
                error=error,
                error_count=1,
                extra={"fetched_row_count": len(crawl_result.rows)},
            )
            return 1
    else:
        logger.step(
            step="insert_bigquery",
            step_status="skipped",
            message="Skipped BigQuery upsert by flag",
            output_summary={"fetched_row_count": len(crawl_result.rows)},
        )

    finished_at = datetime.now(UTC)
    duration_ms = int((finished_at - started_at).total_seconds() * 1000)
    logger.job(
        status="completed",
        message="Internal-links crawl job finished",
        finished_at=finished_at.isoformat(),
        duration_ms=duration_ms,
        fetched_rows=len(crawl_result.rows),
        inserted_rows=inserted_rows,
        updated_rows=updated_rows,
        skipped_rows=skipped_rows,
        extra={
            "output_summary": {
                "crawled_pages": crawl_result.crawled_pages,
                "discovered_targets": crawl_result.discovered_targets,
                "broken_links": crawl_result.broken_links,
            }
        },
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
