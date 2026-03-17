WITH scoped_keywords AS (
  SELECT
    keyword,
    target_url,
    NULLIF(TRIM(COALESCE(pillar, "")), "") AS pillar,
    NULLIF(TRIM(COALESCE(cluster, "")), "") AS cluster,
    NULLIF(TRIM(COALESCE(intent, "")), "") AS intent
  FROM `${PROJECT_ID}.${DATASET}.tracked_keywords`
  WHERE is_active = TRUE
),
filtered_keywords AS (
  SELECT *
  FROM scoped_keywords
  WHERE cluster IS NOT NULL
    AND (
      @pillar_search IS NULL
      OR LOWER(COALESCE(pillar, "")) LIKE CONCAT('%', LOWER(@pillar_search), '%')
    )
    AND LOWER(cluster) LIKE CONCAT('%', LOWER(COALESCE(@cluster_search, "")), '%')
    AND (@intent_filter IS NULL OR intent = @intent_filter)
),
cluster_members AS (
  SELECT
    pillar,
    cluster,
    ARRAY_AGG(DISTINCT intent IGNORE NULLS ORDER BY intent) AS intents,
    COUNT(DISTINCT keyword) AS tracked_keywords,
    COUNT(DISTINCT target_url) AS target_pages
  FROM filtered_keywords
  GROUP BY pillar, cluster
),
range_rows AS (
  SELECT
    filtered_keywords.pillar,
    filtered_keywords.cluster,
    filtered_keywords.keyword,
    filtered_keywords.target_url,
    daily_rankings.date,
    daily_rankings.clicks,
    daily_rankings.impressions,
    daily_rankings.position
  FROM filtered_keywords
  LEFT JOIN `${PROJECT_ID}.${DATASET}.daily_rankings` AS daily_rankings
    ON daily_rankings.keyword = filtered_keywords.keyword
    AND daily_rankings.url = filtered_keywords.target_url
    AND daily_rankings.date BETWEEN @start_date AND @end_date
),
cluster_performance AS (
  SELECT
    pillar,
    cluster,
    SUM(COALESCE(clicks, 0)) AS total_clicks,
    SUM(COALESCE(impressions, 0)) AS total_impressions,
    SAFE_DIVIDE(
      SUM(COALESCE(clicks, 0)),
      NULLIF(SUM(COALESCE(impressions, 0)), 0)
    ) AS ctr,
    AVG(position) AS average_position,
    MAX(date) AS latest_date
  FROM range_rows
  GROUP BY pillar, cluster
),
url_rollup AS (
  SELECT
    pillar,
    cluster,
    target_url,
    SUM(COALESCE(clicks, 0)) AS total_clicks,
    SUM(COALESCE(impressions, 0)) AS total_impressions,
    AVG(position) AS average_position
  FROM range_rows
  GROUP BY pillar, cluster, target_url
),
featured_urls AS (
  SELECT
    pillar,
    cluster,
    target_url AS primary_url
  FROM (
    SELECT
      pillar,
      cluster,
      target_url,
      ROW_NUMBER() OVER (
        PARTITION BY pillar, cluster
        ORDER BY total_impressions DESC, IFNULL(average_position, 9999) ASC, target_url ASC
      ) AS row_num
    FROM url_rollup
  )
  WHERE row_num = 1
),
keyword_rollup AS (
  SELECT
    pillar,
    cluster,
    keyword,
    target_url,
    SUM(COALESCE(clicks, 0)) AS total_clicks,
    SUM(COALESCE(impressions, 0)) AS total_impressions,
    AVG(position) AS average_position
  FROM range_rows
  GROUP BY pillar, cluster, keyword, target_url
),
featured_keywords AS (
  SELECT
    pillar,
    cluster,
    keyword AS primary_keyword,
    target_url AS primary_keyword_url
  FROM (
    SELECT
      pillar,
      cluster,
      keyword,
      target_url,
      ROW_NUMBER() OVER (
        PARTITION BY pillar, cluster
        ORDER BY total_impressions DESC, IFNULL(average_position, 9999) ASC, keyword ASC, target_url ASC
      ) AS row_num
    FROM keyword_rollup
  )
  WHERE row_num = 1
),
cluster_targets AS (
  SELECT DISTINCT
    filtered_keywords.pillar,
    filtered_keywords.cluster,
    filtered_keywords.target_url,
    CASE
      WHEN wp_posts.wp_post_id IS NOT NULL THEN CONCAT('wp:', CAST(wp_posts.wp_post_id AS STRING))
      ELSE CONCAT('url:', filtered_keywords.target_url)
    END AS target_key
  FROM filtered_keywords
  LEFT JOIN `${PROJECT_ID}.${DATASET}.wp_posts` AS wp_posts
    ON wp_posts.url = filtered_keywords.target_url
),
resolved_rewrites AS (
  SELECT
    rewrites.id,
    CASE
      WHEN COALESCE(rewrites.wp_post_id, post_by_url.wp_post_id) IS NOT NULL THEN CONCAT(
        'wp:',
        CAST(COALESCE(rewrites.wp_post_id, post_by_url.wp_post_id) AS STRING)
      )
      ELSE CONCAT('url:', rewrites.url)
    END AS target_key
  FROM `${PROJECT_ID}.${DATASET}.rewrites` AS rewrites
  LEFT JOIN `${PROJECT_ID}.${DATASET}.wp_posts` AS post_by_url
    ON rewrites.wp_post_id IS NULL
    AND post_by_url.url = rewrites.url
  WHERE rewrites.rewrite_date BETWEEN @start_date AND @end_date
),
rewrite_counts AS (
  SELECT
    cluster_targets.pillar,
    cluster_targets.cluster,
    COUNT(DISTINCT resolved_rewrites.id) AS rewrite_count
  FROM cluster_targets
  LEFT JOIN resolved_rewrites
    ON resolved_rewrites.target_key = cluster_targets.target_key
  GROUP BY cluster_targets.pillar, cluster_targets.cluster
),
latest_crawl AS (
  SELECT MAX(crawl_date) AS latest_crawl_date
  FROM `${PROJECT_ID}.${DATASET}.internal_links`
  WHERE crawl_date BETWEEN @start_date AND @end_date
),
latest_links AS (
  SELECT *
  FROM `${PROJECT_ID}.${DATASET}.internal_links`
  WHERE crawl_date = (SELECT latest_crawl_date FROM latest_crawl)
),
inbound_counts AS (
  SELECT
    target_url AS url,
    COUNT(*) AS incoming_links
  FROM latest_links
  GROUP BY target_url
),
broken_pages AS (
  SELECT DISTINCT source_url AS url
  FROM latest_links
  WHERE status_code = 404

  UNION DISTINCT

  SELECT DISTINCT target_url AS url
  FROM latest_links
  WHERE status_code = 404
),
link_issues AS (
  SELECT
    cluster_targets.pillar,
    cluster_targets.cluster,
    MAX((SELECT latest_crawl_date FROM latest_crawl)) AS latest_crawl_date,
    COUNTIF(
      COALESCE(inbound_counts.incoming_links, 0) = 0
      AND (SELECT latest_crawl_date FROM latest_crawl) IS NOT NULL
    ) AS orphan_pages,
    COUNTIF(broken_pages.url IS NOT NULL) AS broken_pages,
    COUNTIF(
      (
        COALESCE(inbound_counts.incoming_links, 0) = 0
        AND (SELECT latest_crawl_date FROM latest_crawl) IS NOT NULL
      )
      OR broken_pages.url IS NOT NULL
    ) AS issue_pages
  FROM cluster_targets
  LEFT JOIN inbound_counts
    ON inbound_counts.url = cluster_targets.target_url
  LEFT JOIN broken_pages
    ON broken_pages.url = cluster_targets.target_url
  GROUP BY cluster_targets.pillar, cluster_targets.cluster
)
SELECT
  cluster_members.pillar,
  cluster_members.cluster,
  cluster_members.intents,
  cluster_members.tracked_keywords,
  cluster_members.target_pages,
  cluster_performance.total_clicks,
  cluster_performance.total_impressions,
  cluster_performance.ctr,
  cluster_performance.average_position,
  cluster_performance.latest_date,
  COALESCE(rewrite_counts.rewrite_count, 0) AS rewrite_count,
  COALESCE(link_issues.orphan_pages, 0) AS orphan_pages,
  COALESCE(link_issues.broken_pages, 0) AS broken_pages,
  COALESCE(link_issues.issue_pages, 0) AS issue_pages,
  link_issues.latest_crawl_date,
  featured_urls.primary_url,
  featured_keywords.primary_keyword,
  featured_keywords.primary_keyword_url
FROM cluster_members
LEFT JOIN cluster_performance
  ON cluster_performance.pillar IS NOT DISTINCT FROM cluster_members.pillar
  AND cluster_performance.cluster = cluster_members.cluster
LEFT JOIN rewrite_counts
  ON rewrite_counts.pillar IS NOT DISTINCT FROM cluster_members.pillar
  AND rewrite_counts.cluster = cluster_members.cluster
LEFT JOIN link_issues
  ON link_issues.pillar IS NOT DISTINCT FROM cluster_members.pillar
  AND link_issues.cluster = cluster_members.cluster
LEFT JOIN featured_urls
  ON featured_urls.pillar IS NOT DISTINCT FROM cluster_members.pillar
  AND featured_urls.cluster = cluster_members.cluster
LEFT JOIN featured_keywords
  ON featured_keywords.pillar IS NOT DISTINCT FROM cluster_members.pillar
  AND featured_keywords.cluster = cluster_members.cluster
ORDER BY
  COALESCE(link_issues.issue_pages, 0) DESC,
  COALESCE(cluster_performance.total_impressions, 0) DESC,
  IFNULL(cluster_performance.average_position, 9999) ASC,
  cluster_members.cluster ASC
LIMIT @limit;
