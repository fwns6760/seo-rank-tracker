# Cloud Run Service

## Web app image

- Dockerfile: `Dockerfile`
- Build config: `cloudbuild.web.yaml`
- Runtime command: `node server.js`
- Next.js build mode: `output: "standalone"`

`scripts/deploy-web-service.sh` は Cloud Build で image を build し、Cloud Run Service へ deploy します。

## Required deploy env vars

- `GOOGLE_CLOUD_PROJECT`
- `CLOUD_RUN_REGION`
- `ARTIFACT_REGISTRY_REPOSITORY`
- `CLOUD_RUN_SERVICE_NAME`
- `CLOUD_RUN_SERVICE_ACCOUNT`
- `BIGQUERY_DATASET`
- `GSC_PROPERTY_URI`
- `TARGET_SITE_HOST`

Optional deploy env vars:

- `BIGQUERY_LOCATION`
- `WEB_IMAGE_NAME`
- `WEB_IMAGE_TAG`
- `WEB_CPU`
- `WEB_MEMORY`
- `WEB_TIMEOUT`
- `WEB_CONCURRENCY`
- `WEB_MIN_INSTANCES`
- `WEB_MAX_INSTANCES`
- `WEB_INGRESS`
- `WEB_ALLOW_UNAUTHENTICATED`
- `WEB_SECRET_MAPPINGS`
- `WORDPRESS_AUTH_MODE`
- `WORDPRESS_BASE_URL`
- `WORDPRESS_POST_TYPE`
- `WORDPRESS_POST_STATUSES`
- `WORDPRESS_USERNAME`
- `WORDPRESS_APPLICATION_PASSWORD_SECRET_NAME`
- `MANUAL_RUN_MODE`
- `MANUAL_RUN_CLOUD_RUN_REGION`
- `MANUAL_RUN_FETCH_GSC_JOB_NAME`

## Example

```bash
export GOOGLE_CLOUD_PROJECT="your-project"
export CLOUD_RUN_REGION="asia-northeast1"
export ARTIFACT_REGISTRY_REPOSITORY="seo-rank-tracker"
export CLOUD_RUN_SERVICE_NAME="seo-rank-tracker"
export CLOUD_RUN_SERVICE_ACCOUNT="seo-rank-tracker-web@your-project.iam.gserviceaccount.com"
export BIGQUERY_DATASET="seo_rank_tracker"
export BIGQUERY_LOCATION="asia-northeast1"
export GSC_PROPERTY_URI="https://prosports.yoshilover.com/"
export TARGET_SITE_HOST="prosports.yoshilover.com"
export MANUAL_RUN_CLOUD_RUN_REGION="${CLOUD_RUN_REGION}"
export MANUAL_RUN_FETCH_GSC_JOB_NAME="prosports-fetch-gsc"

bash scripts/deploy-web-service.sh
```

## Manual run in production

`MANUAL_RUN_MODE=cloud_run_job` を使うと、dashboard の `fetch_gsc` manual run は Web コンテナ内で Python を spawn せず、Cloud Run Job API で `fetch_gsc` を起動します。

必要事項:

- Web Service の service account が対象 Job を実行できること
- `MANUAL_RUN_CLOUD_RUN_REGION` と `MANUAL_RUN_FETCH_GSC_JOB_NAME` を設定すること
- Cloud Logging 上で Job execution を追えること

必要権限は少なくとも `run.jobs.runWithOverrides`, `run.executions.get`, `run.executions.list` を含む必要があります。built-in role では対象 Job に対する `roles/run.developer` が扱いやすい構成です。
