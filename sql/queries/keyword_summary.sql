WITH filtered AS (
  SELECT
    date,
    url,
    keyword,
    position,
    scrape_position,
    clicks,
    impressions
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
latest_day AS (
  SELECT MAX(date) AS latest_date
  FROM filtered
)
SELECT
  @keyword AS keyword,
  ARRAY_AGG(url ORDER BY impressions DESC LIMIT 1)[SAFE_OFFSET(0)] AS primary_url,
  COUNT(DISTINCT url) AS tracked_urls,
  SUM(clicks) AS total_clicks,
  SUM(impressions) AS total_impressions,
  AVG(IF(date = latest_date, position, NULL)) AS latest_average_position,
  AVG(IF(date = latest_date, CAST(scrape_position AS FLOAT64), NULL)) AS latest_average_scrape_position
FROM filtered
CROSS JOIN latest_day;
