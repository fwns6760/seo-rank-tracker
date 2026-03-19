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
recent AS (
  SELECT
    keyword,
    url,
    COUNT(*) AS recent_rows,
    MAX(date) AS latest_date,
    SUM(impressions) AS recent_impressions,
    SUM(clicks) AS recent_clicks
  FROM `${PROJECT_ID}.${DATASET}.daily_rankings`
  WHERE date BETWEEN @recent_start_date AND @recent_end_date
  GROUP BY keyword, url
),
baseline AS (
  SELECT
    keyword,
    url,
    MAX(date) AS baseline_latest_date,
    SUM(impressions) AS baseline_impressions
  FROM `${PROJECT_ID}.${DATASET}.daily_rankings`
  WHERE date BETWEEN @baseline_start_date AND @baseline_end_date
  GROUP BY keyword, url
)
SELECT
  'index_anomaly' AS alert_type,
  'warning' AS alert_severity,
  tracked.keyword,
  tracked.target_url AS url,
  tracked.priority,
  COALESCE(recent.latest_date, baseline.baseline_latest_date) AS latest_date,
  NULL AS latest_position,
  NULL AS previous_position,
  recent.recent_clicks AS latest_clicks,
  recent.recent_impressions AS latest_impressions,
  NULL AS position_delta,
  baseline.baseline_impressions,
  DATE_DIFF(
    CAST(@recent_end_date AS DATE),
    COALESCE(recent.latest_date, baseline.baseline_latest_date),
    DAY
  ) AS days_since_seen,
  CAST(baseline.baseline_impressions AS FLOAT64) AS alert_score
FROM tracked
LEFT JOIN recent
  ON tracked.keyword = recent.keyword
 AND tracked.target_url = recent.url
LEFT JOIN baseline
  ON tracked.keyword = baseline.keyword
 AND tracked.target_url = baseline.url
WHERE COALESCE(baseline.baseline_impressions, 0) > 0
  AND COALESCE(recent.recent_rows, 0) = 0
ORDER BY baseline_impressions DESC, tracked.keyword ASC
LIMIT @limit;
