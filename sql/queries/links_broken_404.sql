WITH latest_crawl AS (
  SELECT MAX(crawl_date) AS latest_crawl_date
  FROM `${PROJECT_ID}.${DATASET}.internal_links`
  WHERE crawl_date BETWEEN @start_date AND @end_date
),
filtered_cluster_urls AS (
  SELECT DISTINCT target_url AS url
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
),
latest_links AS (
  SELECT *
  FROM `${PROJECT_ID}.${DATASET}.internal_links`
  WHERE crawl_date = (SELECT latest_crawl_date FROM latest_crawl)
    AND status_code = 404
    AND (@source_search IS NULL OR LOWER(source_url) LIKE CONCAT('%', LOWER(@source_search), '%'))
    AND (@target_search IS NULL OR LOWER(target_url) LIKE CONCAT('%', LOWER(@target_search), '%'))
    AND (
      (@pillar_search IS NULL AND @cluster_search IS NULL)
      OR source_url IN (SELECT url FROM filtered_cluster_urls)
      OR target_url IN (SELECT url FROM filtered_cluster_urls)
    )
)
SELECT
  crawl_date,
  source_url,
  target_url,
  anchor_text,
  status_code
FROM latest_links
ORDER BY source_url ASC, target_url ASC, anchor_text ASC
LIMIT @limit;
