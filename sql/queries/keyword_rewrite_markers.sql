WITH target_urls AS (
  SELECT DISTINCT url
  FROM `${PROJECT_ID}.${DATASET}.daily_rankings` AS daily_rankings
  WHERE date BETWEEN @start_date AND @end_date
    AND daily_rankings.keyword = @keyword
    AND (@url IS NULL OR daily_rankings.url = @url)
    AND (
      (@pillar_search IS NULL AND @cluster_search IS NULL)
      OR EXISTS (
        SELECT 1
        FROM `${PROJECT_ID}.${DATASET}.tracked_keywords` AS tracked_keywords
        WHERE tracked_keywords.is_active = TRUE
          AND tracked_keywords.keyword = daily_rankings.keyword
          AND tracked_keywords.target_url = daily_rankings.url
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
),
target_posts AS (
  SELECT DISTINCT wp_post_id
  FROM `${PROJECT_ID}.${DATASET}.wp_posts`
  WHERE url IN (SELECT url FROM target_urls)
),
resolved_rewrites AS (
  SELECT
    rewrites.rewrite_date,
    rewrites.url,
    rewrites.rewrite_type,
    rewrites.summary,
    rewrites.memo,
    COALESCE(post_by_id.wp_post_id, post_by_url.wp_post_id, rewrites.wp_post_id) AS wp_post_id
  FROM `${PROJECT_ID}.${DATASET}.rewrites` AS rewrites
  LEFT JOIN `${PROJECT_ID}.${DATASET}.wp_posts` AS post_by_id
    ON post_by_id.wp_post_id = rewrites.wp_post_id
  LEFT JOIN `${PROJECT_ID}.${DATASET}.wp_posts` AS post_by_url
    ON rewrites.wp_post_id IS NULL
    AND post_by_url.url = rewrites.url
  WHERE rewrites.rewrite_date BETWEEN @start_date AND @end_date
)
SELECT
  rewrite_date,
  url,
  rewrite_type,
  summary,
  memo
FROM resolved_rewrites
WHERE url IN (SELECT url FROM target_urls)
  OR wp_post_id IN (SELECT wp_post_id FROM target_posts WHERE wp_post_id IS NOT NULL)
ORDER BY rewrite_date ASC, url ASC;
