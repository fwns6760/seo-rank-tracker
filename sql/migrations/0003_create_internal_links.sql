CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.internal_links` (
  crawl_date DATE NOT NULL,
  source_url STRING NOT NULL,
  target_url STRING NOT NULL,
  anchor_text STRING,
  status_code INT64,
  fetched_at TIMESTAMP NOT NULL,
  execution_id STRING NOT NULL
)
PARTITION BY crawl_date
CLUSTER BY source_url, target_url
OPTIONS (
  description = "Internal-link crawl results used for orphan and broken-link analysis."
);

