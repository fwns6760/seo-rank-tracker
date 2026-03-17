#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  GOOGLE_CLOUD_PROJECT
  CLOUD_RUN_REGION
  ARTIFACT_REGISTRY_REPOSITORY
  CLOUD_RUN_JOB_NAME
  CLOUD_RUN_JOB_SERVICE_ACCOUNT
  BIGQUERY_DATASET
  GSC_PROPERTY_URI
  TARGET_SITE_HOST
)

for required_var in "${required_vars[@]}"; do
  if [[ -z "${!required_var:-}" ]]; then
    echo "Missing required environment variable: ${required_var}" >&2
    exit 1
  fi
done

FETCH_GSC_IMAGE_NAME="${FETCH_GSC_IMAGE_NAME:-fetch-gsc-job}"
FETCH_GSC_IMAGE_TAG="${FETCH_GSC_IMAGE_TAG:-latest}"
BIGQUERY_LOCATION="${BIGQUERY_LOCATION:-asia-northeast1}"
FETCH_GSC_JOB_CPU="${FETCH_GSC_JOB_CPU:-1}"
FETCH_GSC_JOB_MEMORY="${FETCH_GSC_JOB_MEMORY:-512Mi}"
FETCH_GSC_JOB_TIMEOUT="${FETCH_GSC_JOB_TIMEOUT:-1800s}"
FETCH_GSC_JOB_MAX_RETRIES="${FETCH_GSC_JOB_MAX_RETRIES:-1}"
FETCH_GSC_JOB_TASKS="${FETCH_GSC_JOB_TASKS:-1}"
FETCH_GSC_JOB_PARALLELISM="${FETCH_GSC_JOB_PARALLELISM:-1}"
FETCH_GSC_DEFAULT_ARGS="${FETCH_GSC_DEFAULT_ARGS:-}"
FETCH_GSC_SECRET_MAPPINGS="${FETCH_GSC_SECRET_MAPPINGS:-}"

IMAGE_URI="${CLOUD_RUN_REGION}-docker.pkg.dev/${GOOGLE_CLOUD_PROJECT}/${ARTIFACT_REGISTRY_REPOSITORY}/${FETCH_GSC_IMAGE_NAME}:${FETCH_GSC_IMAGE_TAG}"

gcloud builds submit \
  --project="${GOOGLE_CLOUD_PROJECT}" \
  --config="cloudbuild.fetch-gsc.yaml" \
  --substitutions="_IMAGE_URI=${IMAGE_URI}" \
  .

deploy_args=(
  run jobs deploy "${CLOUD_RUN_JOB_NAME}"
  --project="${GOOGLE_CLOUD_PROJECT}"
  --region="${CLOUD_RUN_REGION}"
  --image="${IMAGE_URI}"
  --service-account="${CLOUD_RUN_JOB_SERVICE_ACCOUNT}"
  --tasks="${FETCH_GSC_JOB_TASKS}"
  --parallelism="${FETCH_GSC_JOB_PARALLELISM}"
  --max-retries="${FETCH_GSC_JOB_MAX_RETRIES}"
  --task-timeout="${FETCH_GSC_JOB_TIMEOUT}"
  --cpu="${FETCH_GSC_JOB_CPU}"
  --memory="${FETCH_GSC_JOB_MEMORY}"
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT},BIGQUERY_DATASET=${BIGQUERY_DATASET},BIGQUERY_LOCATION=${BIGQUERY_LOCATION},GSC_PROPERTY_URI=${GSC_PROPERTY_URI},TARGET_SITE_HOST=${TARGET_SITE_HOST}"
)

if [[ -n "${FETCH_GSC_DEFAULT_ARGS}" ]]; then
  deploy_args+=(--args="${FETCH_GSC_DEFAULT_ARGS}")
fi

if [[ -n "${FETCH_GSC_SECRET_MAPPINGS}" ]]; then
  deploy_args+=(--set-secrets="${FETCH_GSC_SECRET_MAPPINGS}")
fi

gcloud "${deploy_args[@]}"
