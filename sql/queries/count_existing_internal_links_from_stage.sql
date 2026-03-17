SELECT COUNT(*) AS existing_rows
FROM `{target_table}` AS target
INNER JOIN `{staging_table}` AS staging
  ON target.crawl_date = staging.crawl_date
  AND target.source_url = staging.source_url
  AND target.target_url = staging.target_url
  AND IFNULL(target.anchor_text, "") = IFNULL(staging.anchor_text, "");
