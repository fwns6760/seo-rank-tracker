"""BigQuery helpers for reading WordPress-related app settings."""

from __future__ import annotations

import json
import os
from typing import Any

import google.auth
from google.cloud import bigquery
from google.oauth2 import service_account

WORDPRESS_APP_SETTING_KEYS = (
    "wordpress_base_url",
    "wordpress_auth_mode",
    "wordpress_username",
    "wordpress_application_password_secret_name",
    "wordpress_post_type",
    "wordpress_post_statuses",
)


def _read_env(key: str) -> str:
    return os.getenv(key, "").strip()


def can_load_wordpress_settings_from_bigquery() -> bool:
    """Returns whether BigQuery-backed app settings can be queried."""

    return bool(_read_env("GOOGLE_CLOUD_PROJECT") and _read_env("BIGQUERY_DATASET"))


def _build_credentials() -> tuple[Any, str]:
    credentials_json = _read_env("GOOGLE_APPLICATION_CREDENTIALS_JSON")

    if credentials_json:
        service_account_info = json.loads(credentials_json)
        credentials = service_account.Credentials.from_service_account_info(
            service_account_info
        )
        project_id = service_account_info.get("project_id") or _read_env(
            "GOOGLE_CLOUD_PROJECT"
        )

        if not project_id:
            raise ValueError("GOOGLE_CLOUD_PROJECT is required to load app_settings")

        return credentials, project_id

    credentials, project_id = google.auth.default()
    resolved_project_id = project_id or _read_env("GOOGLE_CLOUD_PROJECT")

    if not resolved_project_id:
        raise ValueError("GOOGLE_CLOUD_PROJECT is required to load app_settings")

    return credentials, resolved_project_id


def load_wordpress_settings_from_bigquery() -> dict[str, str]:
    """Loads the latest WordPress-related app settings from BigQuery."""

    credentials, project_id = _build_credentials()
    dataset = _read_env("BIGQUERY_DATASET")
    location = _read_env("BIGQUERY_LOCATION") or "asia-northeast1"

    if not dataset:
        raise ValueError("BIGQUERY_DATASET is required to load app_settings")

    client = bigquery.Client(project=project_id, credentials=credentials)
    table_id = f"{project_id}.{dataset}.app_settings"
    query = f"""
    SELECT
      setting_key,
      setting_value
    FROM `{table_id}`
    WHERE setting_key IN UNNEST(@setting_keys)
    QUALIFY ROW_NUMBER() OVER (
      PARTITION BY setting_key
      ORDER BY updated_at DESC
    ) = 1
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ArrayQueryParameter(
                "setting_keys",
                "STRING",
                list(WORDPRESS_APP_SETTING_KEYS),
            )
        ]
    )
    rows = client.query(query, job_config=job_config, location=location).result()

    return {
        str(row["setting_key"]): str(row["setting_value"] or "").strip()
        for row in rows
    }
