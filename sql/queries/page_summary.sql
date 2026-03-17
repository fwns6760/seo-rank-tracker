SELECT
  @url AS url,
  SUM(clicks) AS total_clicks,
  SUM(impressions) AS total_impressions,
  SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(impressions), 0)) AS ctr,
  AVG(position) AS average_position,
  AVG(CAST(scrape_position AS FLOAT64)) AS average_scrape_position,
  COUNT(DISTINCT keyword) AS related_keywords,
  MAX(date) AS latest_date
FROM `${PROJECT_ID}.${DATASET}.daily_rankings`
WHERE date BETWEEN @start_date AND @end_date
  AND url = @url;

