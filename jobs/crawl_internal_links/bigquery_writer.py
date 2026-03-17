"""BigQuery upsert helpers for internal_links."""

from __future__ import annotations

import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import google.auth
from google.cloud import bigquery
from google.oauth2 import service_account

from jobs.crawl_internal_links.models import BigQueryWriteResult, InternalLinkRecord

SQL_ROOT = Path(__file__).resolve().parents[2] / "sql" / "queries"


def _read_env(key: str) -> str:
    value = os.getenv(key, "").strip()
    if not value:
        raise ValueError(f"Missing required environment variable: {key}")
    return value


def _build_credentials() -> tuple[Any, str]:
    credentials_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON", "").strip()

    if credentials_json:
        service_account_info = json.loads(credentials_json)
        credentials = service_account.Credentials.from_service_account_info(
            service_account_info
        )
        project_id = service_account_info.get("project_id") or _read_env(
            "GOOGLE_CLOUD_PROJECT"
        )
        return credentials, project_id

    credentials, project_id = google.auth.default()
    resolved_project_id = _read_env("GOOGLE_CLOUD_PROJECT") if not project_id else project_id
    return credentials, resolved_project_id


def _read_sql_template(file_name: str) -> str:
    return (SQL_ROOT / file_name).read_text(encoding="utf-8")


def _to_stage_table_suffix(execution_id: str) -> str:
    return execution_id.lower().replace("-", "_")


def _get_bigquery_client() -> tuple[bigquery.Client, str, str, str]:
    credentials, project_id = _build_credentials()
    dataset = _read_env("BIGQUERY_DATASET")
    location = os.getenv("BIGQUERY_LOCATION", "asia-northeast1").strip() or "asia-northeast1"
    client = bigquery.Client(project=project_id, credentials=credentials)
    return client, project_id, dataset, location


def normalize_internal_links_rows(
    rows: list[InternalLinkRecord],
    execution_id: str,
    crawl_date: str,
    fetched_at: str,
) -> tuple[list[dict[str, Any]], int]:
    """Maps crawl rows to the internal_links schema and removes duplicates."""

    deduped_rows: dict[tuple[str, str, str, str | None], dict[str, Any]] = {}
    skipped_duplicates = 0

    for row in rows:
        normalized = {
            "crawl_date": crawl_date,
            "source_url": row.source_url,
            "target_url": row.target_url,
            "anchor_text": row.anchor_text,
            "status_code": row.status_code,
            "fetched_at": fetched_at,
            "execution_id": execution_id,
        }
        dedupe_key = (
            normalized["crawl_date"],
            normalized["source_url"],
            normalized["target_url"],
            normalized["anchor_text"],
        )

        if dedupe_key in deduped_rows:
            skipped_duplicates += 1

        deduped_rows[dedupe_key] = normalized

    return list(deduped_rows.values()), skipped_duplicates


def _load_rows_to_staging(
    client: bigquery.Client,
    staging_table_id: str,
    rows: list[dict[str, Any]],
    location: str,
) -> None:
    schema = [
        bigquery.SchemaField("crawl_date", "DATE"),
        bigquery.SchemaField("source_url", "STRING"),
        bigquery.SchemaField("target_url", "STRING"),
        bigquery.SchemaField("anchor_text", "STRING"),
        bigquery.SchemaField("status_code", "INT64"),
        bigquery.SchemaField("fetched_at", "TIMESTAMP"),
        bigquery.SchemaField("execution_id", "STRING"),
    ]
    job_config = bigquery.LoadJobConfig(
        schema=schema,
        write_disposition=bigquery.WriteDisposition.WRITE_TRUNCATE,
    )
    load_job = client.load_table_from_json(
        rows,
        staging_table_id,
        location=location,
        job_config=job_config,
    )
    load_job.result()


def _run_sql(
    client: bigquery.Client,
    sql: str,
    *,
    location: str,
) -> list[dict[str, Any]]:
    query_job = client.query(sql, location=location)
    return [dict(row.items()) for row in query_job.result()]


def upsert_internal_links(
    rows: list[InternalLinkRecord],
    execution_id: str,
    crawl_date: str,
) -> BigQueryWriteResult:
    """Loads normalized crawl rows into staging and merges them into internal_links."""

    client, project_id, dataset, location = _get_bigquery_client()
    fetched_at = datetime.now(UTC).isoformat()
    normalized_rows, skipped_rows = normalize_internal_links_rows(
        rows,
        execution_id,
        crawl_date,
        fetched_at,
    )
    staging_table_id = (
        f"{project_id}.{dataset}._stg_internal_links_{_to_stage_table_suffix(execution_id)}"
    )
    target_table_id = f"{project_id}.{dataset}.internal_links"

    if not normalized_rows:
        return BigQueryWriteResult(
            fetched_rows=0,
            inserted_rows=0,
            updated_rows=0,
            skipped_rows=skipped_rows,
            staging_table_id=staging_table_id,
        )

    _load_rows_to_staging(client, staging_table_id, normalized_rows, location)

    count_sql = _read_sql_template("count_existing_internal_links_from_stage.sql").format(
        target_table=target_table_id,
        staging_table=staging_table_id,
    )
    existing_rows = _run_sql(client, count_sql, location=location)
    updated_rows = int(existing_rows[0]["existing_rows"]) if existing_rows else 0
    inserted_rows = max(0, len(normalized_rows) - updated_rows)

    merge_sql = _read_sql_template("merge_internal_links_from_stage.sql").format(
        target_table=target_table_id,
        staging_table=staging_table_id,
    )
    _run_sql(client, merge_sql, location=location)
    client.delete_table(staging_table_id, not_found_ok=True)

    return BigQueryWriteResult(
        fetched_rows=len(normalized_rows),
        inserted_rows=inserted_rows,
        updated_rows=updated_rows,
        skipped_rows=skipped_rows,
        staging_table_id=staging_table_id,
    )
