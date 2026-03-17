MERGE `{target_table}` AS target
USING `{staging_table}` AS source
  ON target.date = source.date
 AND target.url = source.url
 AND target.keyword = source.keyword
 AND target.source = source.source
WHEN MATCHED THEN
  UPDATE SET
    position = source.position,
    scrape_position = source.scrape_position,
    impressions = source.impressions,
    clicks = source.clicks,
    ctr = source.ctr,
    fetched_at = source.fetched_at,
    execution_id = source.execution_id
WHEN NOT MATCHED THEN
  INSERT (
    date,
    url,
    keyword,
    position,
    scrape_position,
    impressions,
    clicks,
    ctr,
    source,
    fetched_at,
    execution_id
  )
  VALUES (
    source.date,
    source.url,
    source.keyword,
    source.position,
    source.scrape_position,
    source.impressions,
    source.clicks,
    source.ctr,
    source.source,
    source.fetched_at,
    source.execution_id
  );
