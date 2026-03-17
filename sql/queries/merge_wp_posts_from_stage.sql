MERGE `{target_table}` AS target
USING `{staging_table}` AS source
  ON target.wp_post_id = source.wp_post_id
WHEN MATCHED THEN
  UPDATE SET
    url = source.url,
    slug = source.slug,
    title = source.title,
    post_type = source.post_type,
    post_status = source.post_status,
    published_at = source.published_at,
    modified_at = source.modified_at,
    categories = source.categories,
    tags = source.tags,
    content_hash = source.content_hash,
    word_count = source.word_count,
    fetched_at = source.fetched_at,
    execution_id = source.execution_id
WHEN NOT MATCHED THEN
  INSERT (
    wp_post_id,
    url,
    slug,
    title,
    post_type,
    post_status,
    published_at,
    modified_at,
    categories,
    tags,
    content_hash,
    word_count,
    fetched_at,
    execution_id
  )
  VALUES (
    source.wp_post_id,
    source.url,
    source.slug,
    source.title,
    source.post_type,
    source.post_status,
    source.published_at,
    source.modified_at,
    source.categories,
    source.tags,
    source.content_hash,
    source.word_count,
    source.fetched_at,
    source.execution_id
  );
