# Cloud Run Jobs

## fetch_gsc image
- Dockerfile: `jobs/fetch_gsc/Dockerfile`
- Entrypoint: `scripts/run-fetch-gsc.sh`
- Runtime command: `python -m jobs.fetch_gsc.main`

`scripts/run-fetch-gsc.sh` is the shared launcher for local runs and Cloud Run.
It resolves the local `.venv` when present and falls back to `python3` in the
container.

## Runtime arguments
- Default execution uses the CLI defaults in `jobs.fetch_gsc.config`.
- A regular scheduled run can omit args and fetch the trailing `3` JST days.
- Manual backfill examples:
  - `--start-date=2026-03-14,--end-date=2026-03-16`
  - `--start-date=2026-03-16,--end-date=2026-03-16,--skip-bigquery-write`

Cloud Run Jobs accepts container args as comma-separated values:

```bash
gcloud run jobs execute prosports-fetch-gsc \
  --region=asia-northeast1 \
  --args=--start-date=2026-03-14,--end-date=2026-03-16 \
  --wait
```

## Environment variables
Plain env vars:
- `GOOGLE_CLOUD_PROJECT`
- `BIGQUERY_DATASET`
- `BIGQUERY_LOCATION`
- `GSC_PROPERTY_URI`
- `TARGET_SITE_HOST`

Optional secret-backed env vars:
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`

Preferred production setup is to attach a dedicated Cloud Run service account
with BigQuery and Search Console access, and only use Secret Manager for
values that cannot be expressed as plain env vars. If the Search Console access
must rely on a JSON service account key, inject it with `--set-secrets` and
map it to `GOOGLE_APPLICATION_CREDENTIALS_JSON`.

The runtime service account must be able to:
- run BigQuery jobs with `roles/bigquery.jobUser`
- create and merge staging tables with `roles/bigquery.dataEditor` on the target dataset or project
- access the Search Console property as a `Full` user

## Minimal deployment settings
- Region: `asia-northeast1`
- Tasks: `1`
- Parallelism: `1`
- Max retries: `1`
- Timeout: `1800s`
- CPU: `1`
- Memory: `512Mi`

These defaults are encoded in `scripts/deploy-fetch-gsc-job.sh` and can be
overridden via env vars such as `FETCH_GSC_JOB_TIMEOUT` or
`FETCH_GSC_JOB_MEMORY`.

## Deployment script
Use `scripts/deploy-fetch-gsc-job.sh` from the repo root. Required env vars:

- `GOOGLE_CLOUD_PROJECT`
- `CLOUD_RUN_REGION`
- `ARTIFACT_REGISTRY_REPOSITORY`
- `CLOUD_RUN_JOB_NAME`
- `CLOUD_RUN_JOB_SERVICE_ACCOUNT`
- `BIGQUERY_DATASET`
- `GSC_PROPERTY_URI`
- `TARGET_SITE_HOST`

Optional env vars:
- `BIGQUERY_LOCATION`
- `FETCH_GSC_IMAGE_NAME`
- `FETCH_GSC_IMAGE_TAG`
- `FETCH_GSC_DEFAULT_ARGS`
- `FETCH_GSC_SECRET_MAPPINGS`

Example:

```bash
export GOOGLE_CLOUD_PROJECT="your-project"
export CLOUD_RUN_REGION="asia-northeast1"
export ARTIFACT_REGISTRY_REPOSITORY="seo-rank-tracker"
export CLOUD_RUN_JOB_NAME="prosports-fetch-gsc"
export CLOUD_RUN_JOB_SERVICE_ACCOUNT="fetch-gsc-job@your-project.iam.gserviceaccount.com"
export BIGQUERY_DATASET="seo_rank_tracker"
export GSC_PROPERTY_URI="https://prosports.yoshilover.com/"
export TARGET_SITE_HOST="prosports.yoshilover.com"
export FETCH_GSC_SECRET_MAPPINGS="GOOGLE_APPLICATION_CREDENTIALS_JSON=fetch-gsc-sa:latest"

bash scripts/deploy-fetch-gsc-job.sh
```

## Logging behavior
- `JobLogger` writes structured JSON to stdout or stderr.
- Cloud Run Jobs collects container stdout and stderr into Cloud Logging.
- `execution_id`, `job_name`, step logs, and error logs are preserved without
  extra container-specific logging code.

## crawl_internal_links image
- Dockerfile: `jobs/crawl_internal_links/Dockerfile`
- Entrypoint: `scripts/run-crawl-internal-links.sh`
- Runtime command: `python -m jobs.crawl_internal_links.main`

`scripts/run-crawl-internal-links.sh` is the shared launcher for local runs and
Cloud Run. It resolves the local `.venv` when present and falls back to
`python3` in the container.

## crawl_internal_links runtime arguments
- Default execution uses the CLI defaults in `jobs.crawl_internal_links.config`.
- A regular scheduled run can omit args and crawl the same host from
  `https://${TARGET_SITE_HOST}/`.
- Manual override examples:
  - `--max-pages=60`
  - `--start-url=https://prosports.yoshilover.com/baseball-family/`
  - `--skip-bigquery-write`

Cloud Run Jobs accepts container args as comma-separated values:

```bash
gcloud run jobs execute prosports-crawl-internal-links \
  --region=asia-northeast1 \
  --args=--max-pages=60 \
  --wait
```

## crawl_internal_links environment variables
Plain env vars:
- `GOOGLE_CLOUD_PROJECT`
- `BIGQUERY_DATASET`
- `BIGQUERY_LOCATION`
- `TARGET_SITE_HOST`

Optional plain env vars:
- `INTERNAL_LINKS_START_URL`
- `INTERNAL_LINKS_USER_AGENT`

Optional secret-backed env vars:
- `GOOGLE_APPLICATION_CREDENTIALS_JSON`

The runtime service account must be able to:
- run BigQuery jobs with `roles/bigquery.jobUser`
- create and merge staging tables with `roles/bigquery.dataEditor` on the target dataset or project
- fetch the target site over the public network

## crawl_internal_links minimal deployment settings
- Region: `asia-northeast1`
- Tasks: `1`
- Parallelism: `1`
- Max retries: `1`
- Timeout: `1800s`
- CPU: `1`
- Memory: `512Mi`

These defaults are encoded in `scripts/deploy-crawl-internal-links-job.sh` and
can be overridden via env vars such as
`CRAWL_INTERNAL_LINKS_JOB_TIMEOUT` or `CRAWL_INTERNAL_LINKS_JOB_MEMORY`.

## crawl_internal_links deployment script
Use `scripts/deploy-crawl-internal-links-job.sh` from the repo root.
Required env vars:

- `GOOGLE_CLOUD_PROJECT`
- `CLOUD_RUN_REGION`
- `ARTIFACT_REGISTRY_REPOSITORY`
- `CRAWL_INTERNAL_LINKS_JOB_NAME`
- `CRAWL_INTERNAL_LINKS_JOB_SERVICE_ACCOUNT`
- `BIGQUERY_DATASET`
- `TARGET_SITE_HOST`

Optional env vars:
- `BIGQUERY_LOCATION`
- `CRAWL_INTERNAL_LINKS_IMAGE_NAME`
- `CRAWL_INTERNAL_LINKS_IMAGE_TAG`
- `CRAWL_INTERNAL_LINKS_DEFAULT_ARGS`
- `CRAWL_INTERNAL_LINKS_SECRET_MAPPINGS`
- `CRAWL_INTERNAL_LINKS_START_URL`
- `CRAWL_INTERNAL_LINKS_USER_AGENT`

Example:

```bash
export GOOGLE_CLOUD_PROJECT="your-project"
export CLOUD_RUN_REGION="asia-northeast1"
export ARTIFACT_REGISTRY_REPOSITORY="seo-rank-tracker"
export CRAWL_INTERNAL_LINKS_JOB_NAME="prosports-crawl-internal-links"
export CRAWL_INTERNAL_LINKS_JOB_SERVICE_ACCOUNT="crawl-internal-links@your-project.iam.gserviceaccount.com"
export BIGQUERY_DATASET="seo_rank_tracker"
export BIGQUERY_LOCATION="asia-northeast1"
export TARGET_SITE_HOST="prosports.yoshilover.com"
export CRAWL_INTERNAL_LINKS_START_URL="https://prosports.yoshilover.com/"

bash scripts/deploy-crawl-internal-links-job.sh
```
