SELECT
  url,
  SUM(clicks) AS clicks,
  SUM(impressions) AS impressions,
  SAFE_DIVIDE(SUM(clicks), NULLIF(SUM(impressions), 0)) AS ctr,
  AVG(position) AS average_position
FROM `${PROJECT_ID}.${DATASET}.daily_rankings`
WHERE date BETWEEN @start_date AND @end_date
  AND (@url IS NULL OR url = @url)
GROUP BY url
ORDER BY clicks DESC, impressions DESC;
