"""CLI entrypoint for the WordPress post sync job."""

from __future__ import annotations

from datetime import UTC, datetime
import os
from typing import Any

from jobs.fetch_gsc.logging_utils import JobLogger
from jobs.sync_wordpress_posts.bigquery_writer import upsert_wp_posts
from jobs.sync_wordpress_posts.client import (
    build_wordpress_session,
    fetch_wordpress_posts,
)
from jobs.sync_wordpress_posts.config import parse_config, summarize_config
from jobs.sync_wordpress_posts.models import WordPressPostRecord


def _serialize_posts(posts: list[WordPressPostRecord]) -> list[dict[str, Any]]:
    return [
        {
            "wp_post_id": post.wp_post_id,
            "url": post.url,
            "slug": post.slug,
            "title": post.title,
            "post_type": post.post_type,
            "post_status": post.post_status,
            "categories": post.categories,
            "tags": post.tags,
            "published_at": post.published_at,
            "modified_at": post.modified_at,
            "word_count": post.word_count,
        }
        for post in posts
    ]


def main() -> int:
    """Runs the WordPress sync job and emits structured logs."""

    started_at = datetime.now(UTC)
    bootstrap_logger = JobLogger.create(
        job_name="sync_wordpress_posts",
        target_site=os.getenv("TARGET_SITE_HOST", "unknown"),
        execution_id=os.getenv("EXECUTION_ID"),
    )

    try:
        config = parse_config()
    except Exception as error:
        bootstrap_logger.error(
            message="Failed to load sync_wordpress_posts configuration",
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
        message="WordPress post sync job started",
        extra={"input_summary": summarize_config(config)},
    )

    try:
        logger.step(
            step="authenticate_wordpress",
            step_status="started",
            message="Building WordPress REST API session",
        )
        session = build_wordpress_session(config)
        logger.step(
            step="authenticate_wordpress",
            step_status="success",
            message="WordPress REST API session ready",
            output_summary={
                "auth_mode": "basic" if config.auth_username else "none",
            },
        )
    except Exception as error:
        logger.error(
            message="Failed to initialize WordPress session",
            failed_step="authenticate_wordpress",
            recoverable=False,
            error=error,
        )
        return 1

    try:
        logger.step(
            step="fetch_wordpress_posts",
            step_status="started",
            message="Fetching WordPress post metadata",
            input_summary={
                "base_url": config.base_url,
                "post_type": config.post_type,
                "statuses": list(config.statuses),
            },
        )
        posts = fetch_wordpress_posts(session, config)
        serialized_posts = _serialize_posts(posts)
        logger.step(
            step="fetch_wordpress_posts",
            step_status="success",
            message="WordPress post metadata fetched",
            output_summary={
                "fetched_row_count": len(posts),
                "sample_posts": serialized_posts[:3],
            },
        )
    except Exception as error:
        logger.error(
            message="Failed to fetch WordPress post metadata",
            failed_step="fetch_wordpress_posts",
            recoverable=False,
            error=error,
        )
        return 1

    inserted_rows = 0
    updated_rows = 0
    skipped_rows = 0

    if not config.skip_bigquery_write:
        try:
            logger.step(
                step="insert_bigquery",
                step_status="started",
                message="Upserting wp_posts rows into BigQuery",
                input_summary={
                    "fetched_row_count": len(posts),
                },
            )
            write_result = upsert_wp_posts(posts, logger.execution_id)
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
                message="Failed to upsert wp_posts rows into BigQuery",
                failed_step="insert_bigquery",
                recoverable=False,
                error=error,
                error_count=1,
                extra={"fetched_row_count": len(posts)},
            )
            return 1
    else:
        logger.step(
            step="insert_bigquery",
            step_status="skipped",
            message="Skipped BigQuery upsert by flag",
            output_summary={"fetched_row_count": len(posts)},
        )

    finished_at = datetime.now(UTC)
    duration_ms = int((finished_at - started_at).total_seconds() * 1000)
    logger.job(
        status="completed",
        message="WordPress post sync job finished",
        finished_at=finished_at.isoformat(),
        duration_ms=duration_ms,
        fetched_rows=len(posts),
        inserted_rows=inserted_rows,
        updated_rows=updated_rows,
        skipped_rows=skipped_rows,
        extra={
            "output_summary": {
                "fetched_row_count": len(posts),
                "post_type": config.post_type,
                "statuses": list(config.statuses),
            }
        },
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
