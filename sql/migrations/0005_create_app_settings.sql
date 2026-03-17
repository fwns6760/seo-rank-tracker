CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.app_settings` (
  setting_key STRING NOT NULL,
  setting_value STRING,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
)
PARTITION BY DATE(updated_at)
CLUSTER BY setting_key
OPTIONS (
  description = "Operational settings for thresholds, webhook config, scheduler time, and target site."
);
