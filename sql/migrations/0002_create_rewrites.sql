CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.rewrites` (
  id STRING NOT NULL,
  url STRING NOT NULL,
  rewrite_date DATE NOT NULL,
  rewrite_type STRING NOT NULL,
  summary STRING,
  memo STRING,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
)
PARTITION BY rewrite_date
CLUSTER BY url, rewrite_type
OPTIONS (
  description = "Editorial rewrite history for tracked URLs."
);

