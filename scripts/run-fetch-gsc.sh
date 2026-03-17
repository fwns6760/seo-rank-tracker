#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
PROJECT_ROOT=$(CDPATH= cd -- "${SCRIPT_DIR}/.." && pwd)

cd "${PROJECT_ROOT}"

if [ -n "${PYTHON_BIN:-}" ]; then
  PYTHON_CMD="${PYTHON_BIN}"
elif [ -x "${PROJECT_ROOT}/.venv/bin/python" ]; then
  PYTHON_CMD="${PROJECT_ROOT}/.venv/bin/python"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python3"
else
  PYTHON_CMD="python"
fi

exec "${PYTHON_CMD}" -m jobs.fetch_gsc.main "$@"
