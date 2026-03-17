# SQL Layout

## Structure

- `migrations/`: ordered DDL files for datasets, tables, and schema changes.
- `queries/`: reusable analytical queries with named parameters.

## Rules

- Apply migration files in filename order.
- Add a new numbered migration for every schema change. Do not rewrite an existing applied migration.
- Every analytical query against partitioned tables must include an explicit partition filter.
- Prefer named query parameters such as `@start_date` and `@end_date` instead of string concatenation.
- Keep reusable SQL in this directory rather than embedding long query text in route files or jobs.

## Placeholders

- Replace `${PROJECT_ID}` and `${DATASET}` with your target BigQuery identifiers before execution.
- Query templates are written for parameterized execution from application code.

