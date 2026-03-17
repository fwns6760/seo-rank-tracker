WITH range_metrics AS (
  SELECT
    url,
    SUM(clicks) AS total_clicks,
    SUM(impressions) AS total_impressions,
    SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(impressions), 0)) AS ctr,
    AVG(position) AS average_position,
    COUNT(DISTINCT keyword) AS tracked_keywords,
    MAX(date) AS latest_date
  FROM `${PROJECT_ID}.${DATASET}.daily_rankings` AS daily_rankings
  WHERE date BETWEEN @start_date AND @end_date
    AND (@url_search IS NULL OR LOWER(daily_rankings.url) LIKE CONCAT('%', LOWER(@url_search), '%'))
    AND (
      (@pillar_search IS NULL AND @cluster_search IS NULL)
      OR EXISTS (
        SELECT 1
        FROM `${PROJECT_ID}.${DATASET}.tracked_keywords` AS tracked_keywords
        WHERE tracked_keywords.is_active = TRUE
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
  GROUP BY url
),
range_targets AS (
  SELECT
    range_metrics.url,
    range_metrics.total_clicks,
    range_metrics.total_impressions,
    range_metrics.ctr,
    range_metrics.average_position,
    range_metrics.tracked_keywords,
    range_metrics.latest_date,
    wp_posts.wp_post_id,
    wp_posts.title AS wp_post_title,
    CASE
      WHEN wp_posts.wp_post_id IS NOT NULL THEN CONCAT('wp:', CAST(wp_posts.wp_post_id AS STRING))
      ELSE CONCAT('url:', range_metrics.url)
    END AS target_key
  FROM range_metrics
  LEFT JOIN `${PROJECT_ID}.${DATASET}.wp_posts` AS wp_posts
    ON wp_posts.url = range_metrics.url
),
latest_rewrites AS (
  SELECT
    CASE
      WHEN COALESCE(rewrites.wp_post_id, post_by_url.wp_post_id) IS NOT NULL THEN CONCAT(
        'wp:',
        CAST(COALESCE(rewrites.wp_post_id, post_by_url.wp_post_id) AS STRING)
      )
      ELSE CONCAT('url:', rewrites.url)
    END AS target_key,
    MAX(rewrite_date) AS latest_rewrite_date
  FROM `${PROJECT_ID}.${DATASET}.rewrites` AS rewrites
  LEFT JOIN `${PROJECT_ID}.${DATASET}.wp_posts` AS post_by_url
    ON rewrites.wp_post_id IS NULL
    AND post_by_url.url = rewrites.url
  WHERE rewrite_date BETWEEN DATE_SUB(@end_date, INTERVAL 365 DAY) AND @end_date
  GROUP BY target_key
)
SELECT
  range_targets.wp_post_id,
  range_targets.wp_post_title,
  range_targets.url,
  range_targets.total_clicks,
  range_targets.total_impressions,
  range_targets.ctr,
  range_targets.average_position,
  range_targets.tracked_keywords,
  range_targets.latest_date,
  latest_rewrites.latest_rewrite_date,
  DATE_DIFF(@end_date, latest_rewrites.latest_rewrite_date, DAY) AS days_since_last_rewrite
FROM range_targets
LEFT JOIN latest_rewrites
  ON latest_rewrites.target_key = range_targets.target_key
WHERE range_targets.total_impressions >= @minimum_impressions
  AND range_targets.average_position BETWEEN @minimum_position AND @maximum_position
  AND COALESCE(range_targets.ctr, 0) <= @maximum_ctr
  AND (
    latest_rewrites.latest_rewrite_date IS NULL
    OR DATE_DIFF(@end_date, latest_rewrites.latest_rewrite_date, DAY) >= @cooldown_days
  )
ORDER BY range_targets.total_impressions DESC, range_targets.average_position ASC
LIMIT @limit;
