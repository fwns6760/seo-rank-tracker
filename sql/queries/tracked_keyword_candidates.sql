SELECT
  daily_rankings.keyword,
  daily_rankings.url AS target_url,
  SUM(daily_rankings.clicks) AS clicks,
  SUM(daily_rankings.impressions) AS impressions,
  AVG(daily_rankings.position) AS average_position,
  MAX(daily_rankings.date) AS latest_date
FROM `${PROJECT_ID}.${DATASET}.daily_rankings` AS daily_rankings
WHERE daily_rankings.date BETWEEN @start_date AND @end_date
  AND (
    @keyword_search IS NULL
    OR LOWER(daily_rankings.keyword) LIKE CONCAT('%', LOWER(@keyword_search), '%')
  )
  AND (
    @target_url_search IS NULL
    OR LOWER(daily_rankings.url) LIKE CONCAT('%', LOWER(@target_url_search), '%')
  )
  AND NOT EXISTS (
    SELECT 1
    FROM `${PROJECT_ID}.${DATASET}.tracked_keywords` AS tracked_keywords
    WHERE tracked_keywords.keyword = daily_rankings.keyword
      AND tracked_keywords.target_url = daily_rankings.url
  )
GROUP BY daily_rankings.keyword, daily_rankings.url
ORDER BY impressions DESC, clicks DESC, average_position ASC, latest_date DESC
LIMIT @limit;
