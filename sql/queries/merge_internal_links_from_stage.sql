MERGE `{target_table}` AS target
USING `{staging_table}` AS staging
ON target.crawl_date = staging.crawl_date
  AND target.source_url = staging.source_url
  AND target.target_url = staging.target_url
  AND IFNULL(target.anchor_text, "") = IFNULL(staging.anchor_text, "")
WHEN MATCHED THEN
  UPDATE SET
    status_code = staging.status_code,
    fetched_at = staging.fetched_at,
    execution_id = staging.execution_id
WHEN NOT MATCHED THEN
  INSERT (
    crawl_date,
    source_url,
    target_url,
    anchor_text,
    status_code,
    fetched_at,
    execution_id
  )
  VALUES (
    staging.crawl_date,
    staging.source_url,
    staging.target_url,
    staging.anchor_text,
    staging.status_code,
    staging.fetched_at,
    staging.execution_id
  );
