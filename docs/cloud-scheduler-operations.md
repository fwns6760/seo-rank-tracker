# Cloud Scheduler And Operations

## Required APIs
- `run.googleapis.com`
- `cloudscheduler.googleapis.com`
- `cloudbuild.googleapis.com`
- `artifactregistry.googleapis.com`
- `bigquery.googleapis.com`
- `logging.googleapis.com`
- `searchconsole.googleapis.com`
- `iamcredentials.googleapis.com`
- `secretmanager.googleapis.com` when using `--set-secrets`

## Scheduler topology
- Cloud Scheduler sends an authenticated `POST` request to the Cloud Run Admin
  API.
- Target URI:
  `https://run.googleapis.com/v2/projects/PROJECT/locations/REGION/jobs/JOB:run`
- Authentication:
  `--oauth-service-account-email` with scope
  `https://www.googleapis.com/auth/cloud-platform`

Use `scripts/deploy-fetch-gsc-scheduler.sh` or
`scripts/deploy-crawl-internal-links-scheduler.sh` to create or update one
Scheduler job from the repo root.

## Execution schedule policy
- Default schedule: `0 6 * * *`
- Time zone: `Asia/Tokyo`

Reasoning:
- Search Console data is daily and can arrive late.
- The job already re-fetches the trailing `3` JST days.
- Running once in the early morning JST keeps the daily cadence simple while
  allowing late-arriving data to be absorbed by the upsert window.

## Retry policy
- Cloud Run Job task retries: `1`
- Cloud Scheduler retries: `0`

Reasoning:
- `daily_rankings` is written via idempotent upsert, so duplicate runs are not
  destructive, but they do add external API cost and operational noise.
- A failed scheduled execution can be retried manually, and the next scheduled
  run still backfills the trailing `3` days.
- Container-level retries remain enabled once to absorb transient runtime
  failures inside the job.

## fetch_gsc scheduler deployment
Required env vars:
- `GOOGLE_CLOUD_PROJECT`
- `CLOUD_RUN_REGION`
- `CLOUD_RUN_JOB_NAME`
- `CLOUD_SCHEDULER_LOCATION`
- `CLOUD_SCHEDULER_JOB_NAME`
- `CLOUD_SCHEDULER_SERVICE_ACCOUNT`

Optional env vars:
- `CLOUD_SCHEDULER_SCHEDULE`
- `CLOUD_SCHEDULER_TIME_ZONE`
- `CLOUD_SCHEDULER_ATTEMPT_DEADLINE`
- `CLOUD_SCHEDULER_MAX_RETRY_ATTEMPTS`
- `CLOUD_SCHEDULER_MAX_RETRY_DURATION`
- `CLOUD_SCHEDULER_MIN_BACKOFF`
- `CLOUD_SCHEDULER_MAX_BACKOFF`
- `CLOUD_SCHEDULER_MAX_DOUBLINGS`
- `CLOUD_SCHEDULER_MESSAGE_BODY`
- `CLOUD_SCHEDULER_DESCRIPTION`

Example:

```bash
export GOOGLE_CLOUD_PROJECT="your-project"
export CLOUD_RUN_REGION="asia-northeast1"
export CLOUD_RUN_JOB_NAME="prosports-fetch-gsc"
export CLOUD_SCHEDULER_LOCATION="asia-northeast1"
export CLOUD_SCHEDULER_JOB_NAME="prosports-fetch-gsc-daily"
export CLOUD_SCHEDULER_SERVICE_ACCOUNT="scheduler-invoker@your-project.iam.gserviceaccount.com"

bash scripts/deploy-fetch-gsc-scheduler.sh
```

## crawl_internal_links scheduler deployment
Required env vars:
- `GOOGLE_CLOUD_PROJECT`
- `CLOUD_RUN_REGION`
- `CRAWL_INTERNAL_LINKS_JOB_NAME`
- `CRAWL_INTERNAL_LINKS_SCHEDULER_LOCATION`
- `CRAWL_INTERNAL_LINKS_SCHEDULER_JOB_NAME`
- `CRAWL_INTERNAL_LINKS_SCHEDULER_SERVICE_ACCOUNT`

Optional env vars:
- `CRAWL_INTERNAL_LINKS_SCHEDULE`
- `CRAWL_INTERNAL_LINKS_TIME_ZONE`
- `CRAWL_INTERNAL_LINKS_ATTEMPT_DEADLINE`
- `CRAWL_INTERNAL_LINKS_MAX_RETRY_ATTEMPTS`
- `CRAWL_INTERNAL_LINKS_MAX_RETRY_DURATION`
- `CRAWL_INTERNAL_LINKS_MIN_BACKOFF`
- `CRAWL_INTERNAL_LINKS_MAX_BACKOFF`
- `CRAWL_INTERNAL_LINKS_MAX_DOUBLINGS`
- `CRAWL_INTERNAL_LINKS_MESSAGE_BODY`
- `CRAWL_INTERNAL_LINKS_DESCRIPTION`

Example:

```bash
export GOOGLE_CLOUD_PROJECT="your-project"
export CLOUD_RUN_REGION="asia-northeast1"
export CRAWL_INTERNAL_LINKS_JOB_NAME="prosports-crawl-internal-links"
export CRAWL_INTERNAL_LINKS_SCHEDULER_LOCATION="asia-northeast1"
export CRAWL_INTERNAL_LINKS_SCHEDULER_JOB_NAME="prosports-crawl-internal-links-daily"
export CRAWL_INTERNAL_LINKS_SCHEDULER_SERVICE_ACCOUNT="scheduler-invoker@your-project.iam.gserviceaccount.com"

bash scripts/deploy-crawl-internal-links-scheduler.sh
```

Recommended defaults:
- schedule: `30 6 * * *`
- time zone: `Asia/Tokyo`
- Cloud Scheduler retry: `0`
- Cloud Run Job task retry: `1`

## Manual rerun workflow
Backfill a specific date range:

```bash
gcloud run jobs execute prosports-fetch-gsc \
  --region=asia-northeast1 \
  --args=--start-date=2026-03-14,--end-date=2026-03-16 \
  --wait
```

Fetch only and skip BigQuery write:

```bash
gcloud run jobs execute prosports-fetch-gsc \
  --region=asia-northeast1 \
  --args=--start-date=2026-03-16,--end-date=2026-03-16,--skip-bigquery-write \
  --wait
```

Crawl one site snapshot:

```bash
gcloud run jobs execute prosports-crawl-internal-links \
  --region=asia-northeast1 \
  --args=--max-pages=60 \
  --wait
```

## Logging and investigation
Find one execution by `execution_id`:

```bash
gcloud logging read \
  'jsonPayload.execution_id="20260316-fetch-gsc-123456-abcd"' \
  --project="your-project" \
  --limit=100 \
  --format=json
```

Focus on fetch_gsc errors:

```bash
gcloud logging read \
  'jsonPayload.job_name="fetch_gsc" AND severity>=ERROR' \
  --project="your-project" \
  --freshness=7d \
  --limit=100 \
  --format=json
```

Suggested incident flow:
1. Check whether Cloud Scheduler created an execution at the expected JST time.
2. If an execution exists, inspect `execution_id`, `failed_step`, and
   `error_message` in Cloud Logging.
3. If the Scheduler request failed before execution creation, inspect the
   Scheduler job status and OAuth service account permissions.
4. Re-run the job manually with `gcloud run jobs execute` if recovery is
   needed before the next daily schedule.

## Future alerting memo
- Add Slack notification when a scheduled execution does not start.
- Notify on repeated `completed_with_warnings` results, not only hard failures.
- Reuse `execution_id` in alert payloads so Slack and Cloud Logging stay
  correlated.
