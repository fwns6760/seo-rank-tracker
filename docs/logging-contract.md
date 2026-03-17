# Logging Contract

## Goal

Every background job must emit structured JSON logs that can be filtered by `execution_id` in Cloud Logging and reused in future Slack notifications.

## Required fields

- `severity`
- `timestamp`
- `execution_id`
- `job_name`
- `target_site`
- `message`

## Job execution logs

Use job-level logs for lifecycle checkpoints such as `started`, `completed`, `completed_with_warnings`, and `failed`.

Expected fields:

- `started_at`
- `finished_at`
- `duration_ms`
- `fetched_rows`
- `inserted_rows`
- `updated_rows`
- `skipped_rows`
- `error_count`
- `status`

## Step logs

Use step-level logs for fetch, transform, merge, and notify phases.

Expected fields:

- `step`
- `step_status`
- `input_summary`
- `output_summary`
- `retry_count`

## Error logs

Use error logs whenever a recoverable or terminal failure occurs.

Expected fields:

- `error_type`
- `error_message`
- `stacktrace`
- `failed_step`
- `recoverable`

## Slack rule

Future Slack alerts must include `execution_id` so an operator can jump from the notification to Cloud Logging filters for the same run.

