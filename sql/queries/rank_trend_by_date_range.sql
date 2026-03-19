SELECT
  date,
  keyword,
  url,
  AVG(position) AS average_position,
  AVG(scrape_position) AS average_scrape_position,
  SUM(impressions) AS impressions,
  SUM(clicks) AS clicks
FROM `${PROJECT_ID}.${DATASET}.daily_rankings`
WHERE date BETWEEN @start_date AND @end_date
  AND (@keyword = '' OR keyword = @keyword)
  AND (@url = '' OR url = @url)
GROUP BY date, keyword, url
ORDER BY date ASC, keyword ASC, url ASC;
