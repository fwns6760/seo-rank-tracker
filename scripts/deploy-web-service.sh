#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  GOOGLE_CLOUD_PROJECT
  CLOUD_RUN_REGION
  ARTIFACT_REGISTRY_REPOSITORY
  CLOUD_RUN_SERVICE_NAME
  CLOUD_RUN_SERVICE_ACCOUNT
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

WEB_IMAGE_NAME="${WEB_IMAGE_NAME:-seo-rank-tracker-web}"
WEB_IMAGE_TAG="${WEB_IMAGE_TAG:-latest}"
BIGQUERY_LOCATION="${BIGQUERY_LOCATION:-asia-northeast1}"
WEB_CPU="${WEB_CPU:-1}"
WEB_MEMORY="${WEB_MEMORY:-1Gi}"
WEB_TIMEOUT="${WEB_TIMEOUT:-300s}"
WEB_CONCURRENCY="${WEB_CONCURRENCY:-80}"
WEB_MIN_INSTANCES="${WEB_MIN_INSTANCES:-0}"
WEB_MAX_INSTANCES="${WEB_MAX_INSTANCES:-3}"
WEB_INGRESS="${WEB_INGRESS:-all}"
WEB_ALLOW_UNAUTHENTICATED="${WEB_ALLOW_UNAUTHENTICATED:-false}"
WEB_SECRET_MAPPINGS="${WEB_SECRET_MAPPINGS:-}"

if [[ -n "${MANUAL_RUN_FETCH_GSC_JOB_NAME:-}" && -z "${MANUAL_RUN_MODE:-}" ]]; then
  MANUAL_RUN_MODE="cloud_run_job"
fi

IMAGE_URI="${CLOUD_RUN_REGION}-docker.pkg.dev/${GOOGLE_CLOUD_PROJECT}/${ARTIFACT_REGISTRY_REPOSITORY}/${WEB_IMAGE_NAME}:${WEB_IMAGE_TAG}"

declare -a env_entries=(
  "GOOGLE_CLOUD_PROJECT=${GOOGLE_CLOUD_PROJECT}"
  "BIGQUERY_DATASET=${BIGQUERY_DATASET}"
  "BIGQUERY_LOCATION=${BIGQUERY_LOCATION}"
  "GSC_PROPERTY_URI=${GSC_PROPERTY_URI}"
  "TARGET_SITE_HOST=${TARGET_SITE_HOST}"
)

optional_env_vars=(
  WORDPRESS_AUTH_MODE
  WORDPRESS_BASE_URL
  WORDPRESS_POST_TYPE
  WORDPRESS_POST_STATUSES
  WORDPRESS_USERNAME
  WORDPRESS_APPLICATION_PASSWORD_SECRET_NAME
  MANUAL_RUN_MODE
  MANUAL_RUN_CLOUD_RUN_REGION
  MANUAL_RUN_FETCH_GSC_JOB_NAME
)

for optional_env_var in "${optional_env_vars[@]}"; do
  if [[ -n "${!optional_env_var:-}" ]]; then
    env_entries+=("${optional_env_var}=${!optional_env_var}")
  fi
done

joined_env_vars="$(IFS=,; echo "${env_entries[*]}")"

gcloud builds submit \
  --project="${GOOGLE_CLOUD_PROJECT}" \
  --config="cloudbuild.web.yaml" \
  --substitutions="_IMAGE_URI=${IMAGE_URI}" \
  .

deploy_args=(
  run deploy "${CLOUD_RUN_SERVICE_NAME}"
  --project="${GOOGLE_CLOUD_PROJECT}"
  --region="${CLOUD_RUN_REGION}"
  --platform=managed
  --image="${IMAGE_URI}"
  --service-account="${CLOUD_RUN_SERVICE_ACCOUNT}"
  --cpu="${WEB_CPU}"
  --memory="${WEB_MEMORY}"
  --timeout="${WEB_TIMEOUT}"
  --concurrency="${WEB_CONCURRENCY}"
  --min-instances="${WEB_MIN_INSTANCES}"
  --max-instances="${WEB_MAX_INSTANCES}"
  --ingress="${WEB_INGRESS}"
  --set-env-vars="${joined_env_vars}"
)

if [[ "${WEB_ALLOW_UNAUTHENTICATED}" == "true" ]]; then
  deploy_args+=(--allow-unauthenticated)
else
  deploy_args+=(--no-allow-unauthenticated)
fi

if [[ -n "${WEB_SECRET_MAPPINGS}" ]]; then
  deploy_args+=(--set-secrets="${WEB_SECRET_MAPPINGS}")
fi

gcloud "${deploy_args[@]}"

SERVICE_URL="$(gcloud run services describe "${CLOUD_RUN_SERVICE_NAME}" \
  --project="${GOOGLE_CLOUD_PROJECT}" \
  --region="${CLOUD_RUN_REGION}" \
  --format='value(status.url)')"

if [[ -n "${SERVICE_URL}" ]]; then
  echo "Cloud Run service URL: ${SERVICE_URL}"
  echo "Health check endpoint: ${SERVICE_URL}/api/health"
fi
