SELECT
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
FROM `${PROJECT_ID}.${DATASET}.wp_posts`
WHERE url = @url
LIMIT 1;
