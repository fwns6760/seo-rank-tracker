CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.tracked_keywords` (
  keyword STRING NOT NULL,
  target_url STRING NOT NULL,
  category STRING,
  priority STRING,
  is_active BOOL NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(updated_at)
CLUSTER BY target_url, keyword
OPTIONS (
  description = "Configuration table for tracked keywords, target URLs, and alert priority."
);

