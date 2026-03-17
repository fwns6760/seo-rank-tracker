WITH filtered AS (
  SELECT
    date,
    url,
    keyword,
    position
  FROM `${PROJECT_ID}.${DATASET}.daily_rankings`
  WHERE date BETWEEN @start_date AND @end_date
    AND (@keyword IS NULL OR keyword = @keyword)
    AND (@url IS NULL OR url = @url)
),
rank_deltas AS (
  SELECT
    date,
    url,
    keyword,
    position,
    position - LAG(position) OVER (
      PARTITION BY keyword, url
      ORDER BY date
    ) AS position_delta
  FROM filtered
),
latest_day AS (
  SELECT MAX(date) AS latest_date
  FROM filtered
)
SELECT
  COUNT(DISTINCT IF(date = latest_date, keyword, NULL)) AS tracked_keywords,
  AVG(IF(date = latest_date, position, NULL)) AS average_position,
  COUNTIF(date = latest_date AND position_delta < 0) AS improved_keywords,
  COUNTIF(date = latest_date AND position_delta > 0) AS declined_keywords
FROM rank_deltas
CROSS JOIN latest_day;
