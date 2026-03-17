WITH latest_crawl AS (
  SELECT MAX(crawl_date) AS latest_crawl_date
  FROM `${PROJECT_ID}.${DATASET}.internal_links`
  WHERE source_url = @url OR target_url = @url
)
SELECT
  latest_crawl_date,
  COUNTIF(source_url = @url) AS outgoing_links,
  COUNTIF(target_url = @url) AS incoming_links,
  COUNTIF(source_url = @url AND status_code = 404) AS broken_outgoing_links,
  COUNTIF(target_url = @url AND status_code = 404) AS broken_incoming_links
FROM `${PROJECT_ID}.${DATASET}.internal_links`
CROSS JOIN latest_crawl
WHERE latest_crawl_date IS NOT NULL
  AND crawl_date = latest_crawl_date
  AND (source_url = @url OR target_url = @url)
GROUP BY latest_crawl_date;

