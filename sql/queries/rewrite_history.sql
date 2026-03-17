WITH resolved_rewrites AS (
  SELECT
    rewrites.id,
    COALESCE(post_by_id.wp_post_id, post_by_url.wp_post_id, rewrites.wp_post_id) AS wp_post_id,
    rewrites.url,
    rewrites.rewrite_date,
    rewrites.rewrite_type,
    rewrites.summary,
    rewrites.memo,
    rewrites.created_at,
    rewrites.updated_at,
    COALESCE(post_by_id.url, post_by_url.url) AS wp_post_url,
    COALESCE(post_by_id.slug, post_by_url.slug) AS wp_post_slug,
    COALESCE(post_by_id.title, post_by_url.title) AS wp_post_title,
    COALESCE(post_by_id.post_status, post_by_url.post_status) AS wp_post_status
  FROM `${PROJECT_ID}.${DATASET}.rewrites` AS rewrites
  LEFT JOIN `${PROJECT_ID}.${DATASET}.wp_posts` AS post_by_id
    ON post_by_id.wp_post_id = rewrites.wp_post_id
  LEFT JOIN `${PROJECT_ID}.${DATASET}.wp_posts` AS post_by_url
    ON rewrites.wp_post_id IS NULL
    AND post_by_url.url = rewrites.url
  WHERE rewrites.rewrite_date BETWEEN @start_date AND @end_date
)
SELECT
  id,
  wp_post_id,
  wp_post_url,
  wp_post_slug,
  wp_post_title,
  wp_post_status,
  url,
  rewrite_date,
  rewrite_type,
  summary,
  memo,
  created_at,
  updated_at
FROM resolved_rewrites
WHERE (
    (@wp_post_id IS NULL AND (@url IS NULL OR url = @url))
    OR (@wp_post_id IS NOT NULL AND wp_post_id = @wp_post_id)
  )
  AND (
    @url_search IS NULL
    OR LOWER(url) LIKE CONCAT('%', LOWER(@url_search), '%')
    OR LOWER(COALESCE(wp_post_title, '')) LIKE CONCAT('%', LOWER(@url_search), '%')
    OR LOWER(COALESCE(wp_post_slug, '')) LIKE CONCAT('%', LOWER(@url_search), '%')
  )
  AND (
    (@pillar_search IS NULL AND @cluster_search IS NULL)
    OR EXISTS (
      SELECT 1
      FROM `${PROJECT_ID}.${DATASET}.tracked_keywords` AS tracked_keywords
      WHERE tracked_keywords.is_active = TRUE
        AND tracked_keywords.target_url = COALESCE(resolved_rewrites.wp_post_url, resolved_rewrites.url)
        AND (
          @pillar_search IS NULL
          OR LOWER(COALESCE(tracked_keywords.pillar, '')) LIKE CONCAT('%', LOWER(@pillar_search), '%')
        )
        AND (
          @cluster_search IS NULL
          OR LOWER(COALESCE(tracked_keywords.cluster, '')) LIKE CONCAT('%', LOWER(@cluster_search), '%')
        )
    )
  )
ORDER BY rewrite_date DESC, updated_at DESC
LIMIT @limit;
