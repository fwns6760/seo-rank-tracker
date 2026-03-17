MERGE `${PROJECT_ID}.${DATASET}.wp_posts` AS target
USING (
  SELECT
    @wp_post_id AS wp_post_id,
    @url AS url,
    @slug AS slug,
    @title AS title,
    @post_type AS post_type,
    @post_status AS post_status,
    @published_at AS published_at,
    @modified_at AS modified_at,
    @categories AS categories,
    @tags AS tags,
    @content_hash AS content_hash,
    @word_count AS word_count,
    @fetched_at AS fetched_at,
    @execution_id AS execution_id
) AS source
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
