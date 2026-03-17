CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.internal_link_events` (
  id STRING NOT NULL,
  wp_post_id INT64,
  url STRING NOT NULL,
  change_date DATE NOT NULL,
  summary STRING,
  memo STRING,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
)
PARTITION BY change_date
CLUSTER BY wp_post_id, url
OPTIONS (
  description = "Editorial internal-link change events tracked separately from rewrites."
);
