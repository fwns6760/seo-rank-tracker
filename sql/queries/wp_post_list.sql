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
WHERE (
    @search IS NULL
    OR LOWER(url) LIKE CONCAT('%', LOWER(@search), '%')
    OR LOWER(COALESCE(title, '')) LIKE CONCAT('%', LOWER(@search), '%')
    OR LOWER(slug) LIKE CONCAT('%', LOWER(@search), '%')
  )
  AND (@post_status IS NULL OR post_status = @post_status)
ORDER BY modified_at DESC NULLS LAST, wp_post_id DESC
LIMIT @limit;
