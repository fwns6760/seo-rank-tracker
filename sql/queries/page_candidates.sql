SELECT
  url,
  SUM(clicks) AS clicks,
  SUM(impressions) AS impressions,
  SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(impressions), 0)) AS ctr,
  AVG(position) AS average_position,
  COUNT(DISTINCT keyword) AS related_keywords
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
ORDER BY impressions DESC, clicks DESC
LIMIT @limit;
