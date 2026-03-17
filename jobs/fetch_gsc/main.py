"""CLI entrypoint for the Search Console fetch job."""

from __future__ import annotations

import os
from datetime import UTC, datetime
from typing import Any

from jobs.fetch_gsc.bigquery_writer import upsert_daily_rankings
from jobs.fetch_gsc.config import parse_config, summarize_config
from jobs.fetch_gsc.gsc_client import (
    build_search_console_service,
    fetch_daily_rows,
    iter_request_dates,
)
from jobs.fetch_gsc.logging_utils import JobLogger
from jobs.fetch_gsc.models import GscSearchRow


def _serialize_rows(rows: list[GscSearchRow]) -> list[dict[str, Any]]:
    return [row.to_dict() for row in rows]


def main() -> int:
    """Runs the Search Console fetch job and emits structured logs."""

    started_at = datetime.now(UTC)
    bootstrap_logger = JobLogger.create(
        job_name="fetch_gsc",
        target_site=os.getenv("TARGET_SITE_HOST", "unknown"),
        execution_id=os.getenv("EXECUTION_ID"),
    )

    try:
        config = parse_config()
    except Exception as error:
        bootstrap_logger.error(
            message="Failed to load fetch_gsc configuration",
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
        message="Search Console fetch job started",
        extra={"input_summary": summarize_config(config)},
    )

    total_rows = 0
    error_count = 0
    row_counts_by_date: dict[str, int] = {}
    inserted_rows = 0
    updated_rows = 0
    skipped_rows = 0
    all_rows: list[GscSearchRow] = []

    try:
        logger.step(
            step="authenticate_gsc",
            step_status="started",
            message="Building Search Console API client",
        )
        service = build_search_console_service()
        logger.step(
            step="authenticate_gsc",
            step_status="success",
            message="Search Console API client ready",
        )
    except Exception as error:
        logger.error(
            message="Failed to authenticate Search Console API client",
            failed_step="authenticate_gsc",
            recoverable=False,
            error=error,
        )
        return 1

    for request_date in iter_request_dates(config.start_date, config.end_date):
        logger.step(
            step="fetch_search_analytics",
            step_status="started",
            message="Fetching Search Console rows for one day",
            input_summary={"request_date": request_date},
        )
        try:
            rows = fetch_daily_rows(service, config, request_date)
            serialized_rows = _serialize_rows(rows)
            row_count = len(serialized_rows)
            row_counts_by_date[request_date] = row_count
            total_rows += row_count
            all_rows.extend(rows)
            logger.step(
                step="fetch_search_analytics",
                step_status="success",
                message="Search Console rows fetched",
                input_summary={"request_date": request_date},
                output_summary={
                    "request_date": request_date,
                    "row_count": row_count,
                    "sample_rows": serialized_rows[:3],
                },
            )
        except Exception as error:
            error_count += 1
            logger.error(
                message="Failed to fetch Search Console rows for one date",
                failed_step="fetch_search_analytics",
                recoverable=True,
                error=error,
                error_count=error_count,
                extra={"request_date": request_date, "retry_count": 0},
            )

    if not config.skip_bigquery_write:
        try:
            logger.step(
                step="insert_bigquery",
                step_status="started",
                message="Upserting daily_rankings rows into BigQuery",
                input_summary={
                    "fetched_row_count": len(all_rows),
                    "date_count": len(row_counts_by_date),
                },
            )
            write_result = upsert_daily_rankings(all_rows, logger.execution_id)
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
                message="Failed to upsert daily_rankings rows into BigQuery",
                failed_step="insert_bigquery",
                recoverable=False,
                error=error,
                error_count=error_count + 1,
                extra={"fetched_row_count": len(all_rows)},
            )
            return 1
    else:
        logger.step(
            step="insert_bigquery",
            step_status="skipped",
            message="Skipped BigQuery upsert by flag",
            output_summary={"fetched_row_count": len(all_rows)},
        )

    finished_at = datetime.now(UTC)
    duration_ms = int((finished_at - started_at).total_seconds() * 1000)
    completion_status = "completed_with_warnings" if error_count else "completed"

    logger.job(
        status=completion_status,
        severity="WARNING" if error_count else "INFO",
        message="Search Console fetch job finished",
        finished_at=finished_at.isoformat(),
        duration_ms=duration_ms,
        fetched_rows=total_rows,
        inserted_rows=inserted_rows,
        updated_rows=updated_rows,
        skipped_rows=skipped_rows,
        error_count=error_count,
        extra={"output_summary": {"row_counts_by_date": row_counts_by_date}},
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
