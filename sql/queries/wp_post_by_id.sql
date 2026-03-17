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
WHERE wp_post_id = @wp_post_id
LIMIT 1;
