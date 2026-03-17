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

## Deploy behavior

- Web app deploy は `bash scripts/deploy-web-service.sh`
- `fetch_gsc` Job deploy は `bash scripts/deploy-fetch-gsc-job.sh`
- Scheduler deploy は scheduler 用の variables が揃っている場合だけ実行

`workflow_dispatch` では Web app / Job / Scheduler を個別に on/off できます。

## IAM notes

deployer service account には、少なくとも次を実行できる権限が必要です。

- Cloud Build の起動
- Artifact Registry への image push
- Cloud Run Service / Job の deploy 更新
- runtime service account への `actAs`
- Cloud Scheduler 更新

実際の role 設計はプロジェクトの IAM 方針に合わせてください。
