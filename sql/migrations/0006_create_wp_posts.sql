CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.wp_posts` (
  wp_post_id INT64 NOT NULL,
  url STRING NOT NULL,
  slug STRING NOT NULL,
  title STRING,
  post_type STRING NOT NULL,
  post_status STRING NOT NULL,
  published_at TIMESTAMP,
  modified_at TIMESTAMP,
  categories ARRAY<STRING>,
  tags ARRAY<STRING>,
  content_hash STRING,
  word_count INT64,
  fetched_at TIMESTAMP NOT NULL,
  execution_id STRING NOT NULL
)
PARTITION BY DATE(fetched_at)
CLUSTER BY wp_post_id, url, post_status
OPTIONS (
  description = "Canonical WordPress post metadata synced for article-level joins, clustering, and editorial history."
);
