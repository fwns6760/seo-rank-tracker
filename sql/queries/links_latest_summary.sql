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
    AND (
      @url_search IS NULL
      OR LOWER(source_url) LIKE CONCAT('%', LOWER(@url_search), '%')
      OR LOWER(target_url) LIKE CONCAT('%', LOWER(@url_search), '%')
    )
    AND (
      (@pillar_search IS NULL AND @cluster_search IS NULL)
      OR source_url IN (SELECT url FROM filtered_cluster_urls)
      OR target_url IN (SELECT url FROM filtered_cluster_urls)
    )
),
tracked_pages AS (
  SELECT DISTINCT url
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
),
inbound_counts AS (
  SELECT target_url AS url, COUNT(*) AS incoming_links
  FROM latest_links
  GROUP BY target_url
)
SELECT
  (SELECT latest_crawl_date FROM latest_crawl) AS latest_crawl_date,
  (SELECT COUNT(*) FROM latest_links) AS total_links,
  (SELECT COUNTIF(status_code = 404) FROM latest_links) AS broken_links,
  (SELECT COUNT(DISTINCT source_url) FROM latest_links) AS source_pages,
  (SELECT COUNT(DISTINCT target_url) FROM latest_links) AS target_pages,
  (
    SELECT COUNT(*)
    FROM tracked_pages
    LEFT JOIN inbound_counts
      ON inbound_counts.url = tracked_pages.url
    WHERE (SELECT latest_crawl_date FROM latest_crawl) IS NOT NULL
      AND COALESCE(inbound_counts.incoming_links, 0) = 0
  ) AS orphan_pages;
