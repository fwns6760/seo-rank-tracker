CREATE TABLE IF NOT EXISTS `${PROJECT_ID}.${DATASET}.daily_rankings` (
  date DATE NOT NULL,
  url STRING NOT NULL,
  keyword STRING NOT NULL,
  position FLOAT64,
  scrape_position INT64,
  impressions INT64,
  clicks INT64,
  ctr FLOAT64,
  source STRING NOT NULL,
  fetched_at TIMESTAMP NOT NULL,
  execution_id STRING NOT NULL
)
PARTITION BY date
CLUSTER BY url, keyword
OPTIONS (
  description = "Daily SEO ranking facts from Google Search Console and optional scrape checks."
);

