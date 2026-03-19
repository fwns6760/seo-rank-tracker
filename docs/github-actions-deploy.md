# GitHub Actions Deploy

## Workflows

- `.github/workflows/ci.yml`
  - Node / Python の品質チェックを実行
- `.github/workflows/deploy-gcp.yml`
  - `main` push または `workflow_dispatch` で GCP deploy

## Authentication

deploy workflow は Workload Identity Federation を前提にしています。

Required repository secrets:

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_DEPLOYER_SERVICE_ACCOUNT`

Required repository variables:

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `ARTIFACT_REGISTRY_REPOSITORY`
- `CLOUD_RUN_SERVICE_NAME`
- `CLOUD_RUN_SERVICE_ACCOUNT`
- `BIGQUERY_DATASET`
- `BIGQUERY_LOCATION`
- `GSC_PROPERTY_URI`
- `TARGET_SITE_HOST`
- `FETCH_GSC_JOB_NAME`
- `FETCH_GSC_JOB_SERVICE_ACCOUNT`

Optional repository variables:

- `WEB_ALLOW_UNAUTHENTICATED`
- `WEB_SECRET_MAPPINGS`
- `WEB_CPU`
- `WEB_MEMORY`
- `WEB_TIMEOUT`
- `WEB_CONCURRENCY`
- `WEB_MIN_INSTANCES`
- `WEB_MAX_INSTANCES`
- `FETCH_GSC_SECRET_MAPPINGS`
- `FETCH_GSC_IMAGE_TAG`
- `FETCH_GSC_DEFAULT_ARGS`
- `CLOUD_SCHEDULER_LOCATION`
- `CLOUD_SCHEDULER_JOB_NAME`
- `CLOUD_SCHEDULER_SERVICE_ACCOUNT`
- `CRAWL_INTERNAL_LINKS_JOB_NAME`
- `CRAWL_INTERNAL_LINKS_JOB_SERVICE_ACCOUNT`
- `CRAWL_INTERNAL_LINKS_SECRET_MAPPINGS`
- `CRAWL_INTERNAL_LINKS_IMAGE_TAG`
- `CRAWL_INTERNAL_LINKS_DEFAULT_ARGS`
- `CRAWL_INTERNAL_LINKS_START_URL`
- `CRAWL_INTERNAL_LINKS_USER_AGENT`
- `CRAWL_INTERNAL_LINKS_SCHEDULER_LOCATION`
- `CRAWL_INTERNAL_LINKS_SCHEDULER_JOB_NAME`
- `CRAWL_INTERNAL_LINKS_SCHEDULER_SERVICE_ACCOUNT`
- `CRAWL_INTERNAL_LINKS_SCHEDULE`

## Deploy behavior

- Web app deploy は `bash scripts/deploy-web-service.sh`
- `fetch_gsc` Job deploy は `bash scripts/deploy-fetch-gsc-job.sh`
- `crawl_internal_links` Job deploy は `bash scripts/deploy-crawl-internal-links-job.sh`
- Scheduler deploy は `fetch_gsc` / `crawl_internal_links` それぞれ、対応する variables が揃っている場合だけ実行

Web app を public に保つ場合は、repository variable `WEB_ALLOW_UNAUTHENTICATED=true`
を設定してください。未設定または `false` のまま次回 deploy すると、
Cloud Run Service は再び認証必須に戻ります。

`workflow_dispatch` では Web app / `fetch_gsc` / `crawl_internal_links` の deploy を個別に on/off できます。

## IAM notes

deployer service account には、少なくとも次を実行できる権限が必要です。

- Cloud Build の起動
- Artifact Registry への image push
- Cloud Run Service / Job の deploy 更新
- runtime service account への `actAs`
- Cloud Scheduler 更新

実際の role 設計はプロジェクトの IAM 方針に合わせてください。
