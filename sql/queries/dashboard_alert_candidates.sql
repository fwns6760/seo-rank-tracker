WITH filtered AS (
  SELECT
    date,
    url,
    keyword,
    position,
    clicks,
    impressions
FROM `${PROJECT_ID}.${DATASET}.daily_rankings`
WHERE date BETWEEN @start_date AND @end_date
    AND (@keyword = '' OR keyword = @keyword)
    AND (@url = '' OR url = @url)
),
ranked AS (
  SELECT
    date,
    url,
    keyword,
    position,
    clicks,
    impressions,
    ROW_NUMBER() OVER (
      PARTITION BY keyword, url
      ORDER BY date DESC
    ) AS recency_rank
  FROM filtered
)
SELECT
  url,
  keyword,
  MAX(IF(recency_rank = 1, date, NULL)) AS latest_date,
  MAX(IF(recency_rank = 1, position, NULL)) AS latest_position,
  MAX(IF(recency_rank = 2, position, NULL)) AS previous_position,
  MAX(IF(recency_rank = 1, clicks, NULL)) AS latest_clicks,
  MAX(IF(recency_rank = 1, impressions, NULL)) AS latest_impressions,
  MAX(IF(recency_rank = 1, position, NULL))
    - MAX(IF(recency_rank = 2, position, NULL)) AS position_delta
FROM ranked
WHERE recency_rank <= 2
GROUP BY url, keyword
HAVING previous_position IS NOT NULL
ORDER BY ABS(position_delta) DESC, latest_impressions DESC
LIMIT @limit;
