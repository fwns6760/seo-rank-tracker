"""Structured JSON logging helpers for Cloud Logging."""

from __future__ import annotations

import json
import re
import secrets
import sys
import traceback
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from zoneinfo import ZoneInfo

JST = ZoneInfo("Asia/Tokyo")


def _sanitize(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.astimezone(UTC).isoformat()
    if isinstance(value, BaseException):
        return {
            "name": type(value).__name__,
            "message": str(value),
            "stacktrace": getattr(value, "__traceback__", None),
        }
    if isinstance(value, dict):
        return {key: _sanitize(nested) for key, nested in value.items()}
    if isinstance(value, list):
        return [_sanitize(item) for item in value]
    return value


def create_execution_id(job_name: str, now: datetime | None = None) -> str:
    """Creates a unique execution id with a JST date prefix."""

    current = now or datetime.now(UTC)
    jst = current.astimezone(JST)
    date_part = jst.strftime("%Y%m%d")
    time_part = jst.strftime("%H%M%S")
    normalized_job_name = re.sub(r"[^a-z0-9]+", "-", job_name.strip().lower()).strip("-") or "job"
    return f"{date_part}-{normalized_job_name}-{time_part}-{secrets.token_hex(2)}"


@dataclass(slots=True)
class JobLogger:
    """Job-scoped structured logger."""

    execution_id: str
    job_name: str
    target_site: str
    started_at: str

    @classmethod
    def create(
        cls,
        job_name: str,
        target_site: str,
        *,
        execution_id: str | None = None,
        started_at: str | None = None,
    ) -> "JobLogger":
        """Creates a new logger context for one job execution."""

        return cls(
            execution_id=execution_id or create_execution_id(job_name),
            job_name=job_name,
            target_site=target_site,
            started_at=started_at or datetime.now(UTC).isoformat(),
        )

    def _emit(self, severity: str, payload: dict[str, Any]) -> None:
        entry = {
            "severity": severity,
            "timestamp": datetime.now(UTC).isoformat(),
            "execution_id": self.execution_id,
            "job_name": self.job_name,
            "target_site": self.target_site,
            "started_at": self.started_at,
            **payload,
        }
        stream = sys.stderr if severity == "ERROR" else sys.stdout
        stream.write(json.dumps(_sanitize(entry), ensure_ascii=False) + "\n")

    def job(
        self,
        *,
        status: str,
        message: str,
        severity: str = "INFO",
        finished_at: str | None = None,
        duration_ms: int | None = None,
        fetched_rows: int = 0,
        inserted_rows: int = 0,
        updated_rows: int = 0,
        skipped_rows: int = 0,
        error_count: int = 0,
        extra: dict[str, Any] | None = None,
    ) -> None:
        """Emits a job-level structured log."""

        self._emit(
            severity,
            {
                "finished_at": finished_at,
                "duration_ms": duration_ms,
                "fetched_rows": fetched_rows,
                "inserted_rows": inserted_rows,
                "updated_rows": updated_rows,
                "skipped_rows": skipped_rows,
                "error_count": error_count,
                "status": status,
                "message": message,
                **(extra or {}),
            },
        )

    def step(
        self,
        *,
        step: str,
        step_status: str,
        message: str,
        severity: str = "INFO",
        input_summary: Any = None,
        output_summary: Any = None,
        retry_count: int = 0,
        extra: dict[str, Any] | None = None,
    ) -> None:
        """Emits a step-level structured log."""

        self._emit(
            severity,
            {
                "step": step,
                "step_status": step_status,
                "message": message,
                "input_summary": input_summary,
                "output_summary": output_summary,
                "retry_count": retry_count,
                **(extra or {}),
            },
        )

    def error(
        self,
        *,
        message: str,
        failed_step: str,
        recoverable: bool,
        error: BaseException,
        severity: str | None = None,
        error_count: int = 1,
        extra: dict[str, Any] | None = None,
    ) -> None:
        """Emits a structured error log."""

        resolved_severity = severity or ("WARNING" if recoverable else "ERROR")
        self._emit(
            resolved_severity,
            {
                "status": "completed_with_warnings" if recoverable else "failed",
                "message": message,
                "error_count": error_count,
                "error_type": type(error).__name__,
                "error_message": str(error),
                "stacktrace": "".join(traceback.format_exception(error)),
                "failed_step": failed_step,
                "recoverable": recoverable,
                **(extra or {}),
            },
        )
