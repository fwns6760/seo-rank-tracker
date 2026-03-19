WITH tracked AS (
  SELECT
    keyword,
    target_url,
    priority
FROM `${PROJECT_ID}.${DATASET}.tracked_keywords`
WHERE is_active = TRUE
    AND (@keyword = '' OR keyword = @keyword)
    AND (@url = '' OR target_url = @url)
),
filtered AS (
  SELECT
    daily.date,
    daily.url,
    daily.keyword,
    daily.position,
    daily.clicks,
    daily.impressions,
    tracked.priority
  FROM `${PROJECT_ID}.${DATASET}.daily_rankings` AS daily
  INNER JOIN tracked
    ON daily.keyword = tracked.keyword
   AND daily.url = tracked.target_url
  WHERE daily.date BETWEEN @start_date AND @end_date
),
ranked AS (
  SELECT
    date,
    url,
    keyword,
    position,
    clicks,
    impressions,
    priority,
    ROW_NUMBER() OVER (
      PARTITION BY keyword, url
      ORDER BY date DESC
    ) AS recency_rank
  FROM filtered
),
aggregated AS (
  SELECT
    url,
    keyword,
    ANY_VALUE(priority) AS priority,
    MAX(IF(recency_rank = 1, date, NULL)) AS latest_date,
    MAX(IF(recency_rank = 1, position, NULL)) AS latest_position,
    MAX(IF(recency_rank = 2, position, NULL)) AS previous_position,
    MAX(IF(recency_rank = 1, clicks, NULL)) AS latest_clicks,
    MAX(IF(recency_rank = 1, impressions, NULL)) AS latest_impressions
  FROM ranked
  WHERE recency_rank <= 2
  GROUP BY url, keyword
)
SELECT
  CASE
    WHEN latest_position - previous_position >= @drop_threshold THEN 'rank_drop'
    ELSE 'rank_rise'
  END AS alert_type,
  CASE
    WHEN latest_position - previous_position >= @drop_threshold THEN 'warning'
    ELSE 'info'
  END AS alert_severity,
  keyword,
  url,
  priority,
  latest_date,
  latest_position,
  previous_position,
  latest_clicks,
  latest_impressions,
  latest_position - previous_position AS position_delta,
  NULL AS baseline_impressions,
  NULL AS days_since_seen,
  ABS(latest_position - previous_position) AS alert_score
FROM aggregated
WHERE previous_position IS NOT NULL
  AND latest_position IS NOT NULL
  AND (
    latest_position - previous_position >= @drop_threshold
    OR latest_position - previous_position <= -@rise_threshold
  )
ORDER BY alert_score DESC, latest_impressions DESC, keyword ASC
LIMIT @limit;
