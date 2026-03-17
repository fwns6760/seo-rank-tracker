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
)
SELECT
  date,
  AVG(position) AS average_position,
  COUNT(DISTINCT keyword) AS tracked_keywords,
  COUNTIF(position_delta < 0) AS improved_keywords,
  COUNTIF(position_delta > 0) AS declined_keywords
FROM rank_deltas
GROUP BY date
ORDER BY date ASC;

