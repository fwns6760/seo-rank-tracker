#!/usr/bin/env bash
set -euo pipefail

required_vars=(
  GOOGLE_CLOUD_PROJECT
  CLOUD_RUN_REGION
  CLOUD_RUN_JOB_NAME
  CLOUD_SCHEDULER_LOCATION
  CLOUD_SCHEDULER_JOB_NAME
  CLOUD_SCHEDULER_SERVICE_ACCOUNT
)

for required_var in "${required_vars[@]}"; do
  if [[ -z "${!required_var:-}" ]]; then
    echo "Missing required environment variable: ${required_var}" >&2
    exit 1
  fi
done

CLOUD_SCHEDULER_SCHEDULE="${CLOUD_SCHEDULER_SCHEDULE:-0 6 * * *}"
CLOUD_SCHEDULER_TIME_ZONE="${CLOUD_SCHEDULER_TIME_ZONE:-Asia/Tokyo}"
CLOUD_SCHEDULER_ATTEMPT_DEADLINE="${CLOUD_SCHEDULER_ATTEMPT_DEADLINE:-300s}"
CLOUD_SCHEDULER_MAX_RETRY_ATTEMPTS="${CLOUD_SCHEDULER_MAX_RETRY_ATTEMPTS:-0}"
CLOUD_SCHEDULER_MAX_RETRY_DURATION="${CLOUD_SCHEDULER_MAX_RETRY_DURATION:-0s}"
CLOUD_SCHEDULER_MIN_BACKOFF="${CLOUD_SCHEDULER_MIN_BACKOFF:-5s}"
CLOUD_SCHEDULER_MAX_BACKOFF="${CLOUD_SCHEDULER_MAX_BACKOFF:-300s}"
CLOUD_SCHEDULER_MAX_DOUBLINGS="${CLOUD_SCHEDULER_MAX_DOUBLINGS:-2}"
CLOUD_SCHEDULER_MESSAGE_BODY="${CLOUD_SCHEDULER_MESSAGE_BODY:-{}}"
CLOUD_SCHEDULER_DESCRIPTION="${CLOUD_SCHEDULER_DESCRIPTION:-Run fetch_gsc once per day.}"
CLOUD_SCHEDULER_OAUTH_SCOPE="${CLOUD_SCHEDULER_OAUTH_SCOPE:-https://www.googleapis.com/auth/cloud-platform}"

RUN_JOB_URI="https://run.googleapis.com/v2/projects/${GOOGLE_CLOUD_PROJECT}/locations/${CLOUD_RUN_REGION}/jobs/${CLOUD_RUN_JOB_NAME}:run"

common_args=(
  --project="${GOOGLE_CLOUD_PROJECT}"
  --location="${CLOUD_SCHEDULER_LOCATION}"
  --schedule="${CLOUD_SCHEDULER_SCHEDULE}"
  --time-zone="${CLOUD_SCHEDULER_TIME_ZONE}"
  --uri="${RUN_JOB_URI}"
  --http-method=POST
  --attempt-deadline="${CLOUD_SCHEDULER_ATTEMPT_DEADLINE}"
  --description="${CLOUD_SCHEDULER_DESCRIPTION}"
  --oauth-service-account-email="${CLOUD_SCHEDULER_SERVICE_ACCOUNT}"
  --oauth-token-scope="${CLOUD_SCHEDULER_OAUTH_SCOPE}"
  --max-retry-attempts="${CLOUD_SCHEDULER_MAX_RETRY_ATTEMPTS}"
  --max-retry-duration="${CLOUD_SCHEDULER_MAX_RETRY_DURATION}"
  --min-backoff="${CLOUD_SCHEDULER_MIN_BACKOFF}"
  --max-backoff="${CLOUD_SCHEDULER_MAX_BACKOFF}"
  --max-doublings="${CLOUD_SCHEDULER_MAX_DOUBLINGS}"
  --message-body="${CLOUD_SCHEDULER_MESSAGE_BODY}"
)

if gcloud scheduler jobs describe "${CLOUD_SCHEDULER_JOB_NAME}" \
  --project="${GOOGLE_CLOUD_PROJECT}" \
  --location="${CLOUD_SCHEDULER_LOCATION}" >/dev/null 2>&1; then
  gcloud scheduler jobs update http "${CLOUD_SCHEDULER_JOB_NAME}" \
    "${common_args[@]}" \
    --update-headers="Content-Type=application/json"
else
  gcloud scheduler jobs create http "${CLOUD_SCHEDULER_JOB_NAME}" \
    "${common_args[@]}" \
    --headers="Content-Type=application/json"
fi
