SELECT
  keyword,
  ARRAY_AGG(url ORDER BY impressions DESC LIMIT 1)[SAFE_OFFSET(0)] AS primary_url,
  SUM(impressions) AS impressions,
  AVG(position) AS average_position,
  MAX(date) AS latest_date
FROM `${PROJECT_ID}.${DATASET}.daily_rankings`
AS daily_rankings
WHERE date BETWEEN @start_date AND @end_date
  AND (@keyword_search IS NULL OR LOWER(daily_rankings.keyword) LIKE CONCAT('%', LOWER(@keyword_search), '%'))
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
GROUP BY keyword
ORDER BY impressions DESC, average_position ASC
LIMIT @limit;
