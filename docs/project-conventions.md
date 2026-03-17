# Project Conventions

## Server and client boundaries

- Default to Server Components under `app/`.
- Split interactive charts, forms, and browser-only logic into Client Components.
- Keep direct data access out of route files and page files. Query logic belongs in `lib/`.

## Directory ownership

- `app/`: route segments, layouts, and route handlers.
- `components/`: presentational and reusable UI building blocks.
- `lib/`: shared application logic, adapters, validators, and integration helpers.
- `jobs/`: single-responsibility background job entrypoints.
- `sql/`: versioned query files and DDL scripts.
- `tests/`: automated tests for UI, jobs, and shared logic.

## Environment variables

- Local development uses `.env.local`.
- Repository-safe defaults live in `.env.local.example`.
- Production secrets must come from Secret Manager, not from committed files.
- Server-only variables should be read in `lib/` modules, not inside Client Components.
- Prefer workload identity or the runtime service account in Cloud Run jobs when possible.
- For local development, use either `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_APPLICATION_CREDENTIALS_JSON`.
