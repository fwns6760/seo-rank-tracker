WITH latest_crawl AS (
  SELECT MAX(crawl_date) AS latest_crawl_date
  FROM `${PROJECT_ID}.${DATASET}.internal_links`
  WHERE crawl_date BETWEEN @start_date AND @end_date
),
latest_links AS (
  SELECT *
  FROM `${PROJECT_ID}.${DATASET}.internal_links`
  WHERE crawl_date = (SELECT latest_crawl_date FROM latest_crawl)
    AND (
      (@pillar_search IS NULL AND @cluster_search IS NULL)
      OR source_url IN (
        SELECT target_url
        FROM `${PROJECT_ID}.${DATASET}.tracked_keywords`
        WHERE is_active = TRUE
          AND (
            @pillar_search IS NULL
            OR LOWER(COALESCE(pillar, '')) LIKE CONCAT('%', LOWER(@pillar_search), '%')
          )
          AND (
            @cluster_search IS NULL
            OR LOWER(COALESCE(cluster, '')) LIKE CONCAT('%', LOWER(@cluster_search), '%')
          )
      )
      OR target_url IN (
        SELECT target_url
        FROM `${PROJECT_ID}.${DATASET}.tracked_keywords`
        WHERE is_active = TRUE
          AND (
            @pillar_search IS NULL
            OR LOWER(COALESCE(pillar, '')) LIKE CONCAT('%', LOWER(@pillar_search), '%')
          )
          AND (
            @cluster_search IS NULL
            OR LOWER(COALESCE(cluster, '')) LIKE CONCAT('%', LOWER(@cluster_search), '%')
          )
      )
    )
),
tracked_pages AS (
  SELECT
    url,
    SUM(clicks) AS total_clicks,
    SUM(impressions) AS total_impressions,
    AVG(position) AS average_position,
    MAX(date) AS latest_date
  FROM `${PROJECT_ID}.${DATASET}.daily_rankings`
  WHERE date BETWEEN @start_date AND @end_date
    AND (@url_search IS NULL OR LOWER(url) LIKE CONCAT('%', LOWER(@url_search), '%'))
    AND (
      (@pillar_search IS NULL AND @cluster_search IS NULL)
      OR EXISTS (
        SELECT 1
        FROM `${PROJECT_ID}.${DATASET}.tracked_keywords` AS tracked_keywords
        WHERE tracked_keywords.is_active = TRUE
          AND tracked_keywords.target_url = `${PROJECT_ID}.${DATASET}.daily_rankings`.url
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
  GROUP BY url
),
inbound_counts AS (
  SELECT target_url AS url, COUNT(*) AS incoming_links
  FROM latest_links
  GROUP BY target_url
)
SELECT
  tracked_pages.url,
  tracked_pages.total_clicks,
  tracked_pages.total_impressions,
  tracked_pages.average_position,
  tracked_pages.latest_date,
  COALESCE(inbound_counts.incoming_links, 0) AS incoming_links
FROM tracked_pages
LEFT JOIN inbound_counts
  ON inbound_counts.url = tracked_pages.url
WHERE COALESCE(inbound_counts.incoming_links, 0) = 0
  AND (SELECT latest_crawl_date FROM latest_crawl) IS NOT NULL
ORDER BY tracked_pages.total_impressions DESC, tracked_pages.average_position ASC
LIMIT @limit;
