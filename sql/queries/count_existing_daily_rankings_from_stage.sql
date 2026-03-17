SELECT COUNT(*) AS existing_rows
FROM `{staging_table}` AS source
JOIN `{target_table}` AS target
  ON target.date = source.date
 AND target.url = source.url
 AND target.keyword = source.keyword
 AND target.source = source.source;

