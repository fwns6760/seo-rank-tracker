FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY jobs/fetch_gsc/requirements.txt /tmp/fetch-gsc-requirements.txt

RUN python -m pip install --upgrade pip \
    && python -m pip install -r /tmp/fetch-gsc-requirements.txt

COPY jobs /app/jobs
COPY sql /app/sql
COPY scripts /app/scripts

ENTRYPOINT ["/bin/sh", "/app/scripts/run-fetch-gsc.sh"]
