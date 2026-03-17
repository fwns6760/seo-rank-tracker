WITH resolved_rewrites AS (
  SELECT
    rewrites.id,
    COALESCE(post_by_id.wp_post_id, post_by_url.wp_post_id, rewrites.wp_post_id) AS wp_post_id,
    rewrites.url,
    rewrites.rewrite_date,
    rewrites.rewrite_type,
    rewrites.summary,
    rewrites.updated_at,
    COALESCE(post_by_id.url, post_by_url.url) AS wp_post_url,
    COALESCE(post_by_id.slug, post_by_url.slug) AS wp_post_slug,
    COALESCE(post_by_id.title, post_by_url.title) AS wp_post_title,
    COALESCE(post_by_id.post_status, post_by_url.post_status) AS wp_post_status
  FROM `${PROJECT_ID}.${DATASET}.rewrites` AS rewrites
  LEFT JOIN `${PROJECT_ID}.${DATASET}.wp_posts` AS post_by_id
    ON post_by_id.wp_post_id = rewrites.wp_post_id
  LEFT JOIN `${PROJECT_ID}.${DATASET}.wp_posts` AS post_by_url
    ON rewrites.wp_post_id IS NULL
    AND post_by_url.url = rewrites.url
  WHERE rewrites.rewrite_date BETWEEN @start_date AND @end_date
),
target_rewrites AS (
  SELECT
    id,
    wp_post_id,
    wp_post_url,
    wp_post_slug,
    wp_post_title,
    wp_post_status,
    url,
    rewrite_date,
    rewrite_type,
    summary,
    updated_at
  FROM resolved_rewrites
  WHERE (
      (@wp_post_id IS NULL AND (@url IS NULL OR url = @url))
      OR (@wp_post_id IS NOT NULL AND wp_post_id = @wp_post_id)
    )
    AND (
      @url_search IS NULL
      OR LOWER(url) LIKE CONCAT('%', LOWER(@url_search), '%')
      OR LOWER(COALESCE(wp_post_title, '')) LIKE CONCAT('%', LOWER(@url_search), '%')
      OR LOWER(COALESCE(wp_post_slug, '')) LIKE CONCAT('%', LOWER(@url_search), '%')
    )
    AND (
      (@pillar_search IS NULL AND @cluster_search IS NULL)
      OR EXISTS (
        SELECT 1
        FROM `${PROJECT_ID}.${DATASET}.tracked_keywords` AS tracked_keywords
        WHERE tracked_keywords.is_active = TRUE
          AND tracked_keywords.target_url = COALESCE(resolved_rewrites.wp_post_url, resolved_rewrites.url)
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
  ORDER BY rewrite_date DESC, updated_at DESC
  LIMIT @limit
),
target_rewrites_with_urls AS (
  SELECT
    target_rewrites.*,
    ARRAY(
      SELECT DISTINCT candidate_url
      FROM UNNEST(
        ARRAY_CONCAT(
          IF(target_rewrites.url IS NULL, ARRAY<STRING>[], [target_rewrites.url]),
          IF(
            target_rewrites.wp_post_url IS NULL,
            ARRAY<STRING>[],
            [target_rewrites.wp_post_url]
          ),
          IF(
            target_rewrites.wp_post_id IS NULL,
            ARRAY<STRING>[],
            ARRAY(
              SELECT historical.url
              FROM resolved_rewrites AS historical
              WHERE historical.wp_post_id = target_rewrites.wp_post_id
                AND historical.url IS NOT NULL
            )
          )
        )
      ) AS candidate_url
      WHERE candidate_url IS NOT NULL
    ) AS candidate_urls
  FROM target_rewrites
),
ranking_metrics AS (
  SELECT
    target_rewrites_with_urls.id,
    AVG(
      IF(
        daily_rankings.date BETWEEN DATE_SUB(target_rewrites_with_urls.rewrite_date, INTERVAL @window_days DAY)
        AND DATE_SUB(target_rewrites_with_urls.rewrite_date, INTERVAL 1 DAY),
        daily_rankings.position,
        NULL
      )
    ) AS before_average_position,
    AVG(
      IF(
        daily_rankings.date BETWEEN DATE_ADD(target_rewrites_with_urls.rewrite_date, INTERVAL 1 DAY)
        AND DATE_ADD(target_rewrites_with_urls.rewrite_date, INTERVAL @window_days DAY),
        daily_rankings.position,
        NULL
      )
    ) AS after_average_position,
    SUM(
      IF(
        daily_rankings.date BETWEEN DATE_SUB(target_rewrites_with_urls.rewrite_date, INTERVAL @window_days DAY)
        AND DATE_SUB(target_rewrites_with_urls.rewrite_date, INTERVAL 1 DAY),
        daily_rankings.clicks,
        0
      )
    ) AS before_clicks,
    SUM(
      IF(
        daily_rankings.date BETWEEN DATE_ADD(target_rewrites_with_urls.rewrite_date, INTERVAL 1 DAY)
        AND DATE_ADD(target_rewrites_with_urls.rewrite_date, INTERVAL @window_days DAY),
        daily_rankings.clicks,
        0
      )
    ) AS after_clicks,
    SUM(
      IF(
        daily_rankings.date BETWEEN DATE_SUB(target_rewrites_with_urls.rewrite_date, INTERVAL @window_days DAY)
        AND DATE_SUB(target_rewrites_with_urls.rewrite_date, INTERVAL 1 DAY),
        daily_rankings.impressions,
        0
      )
    ) AS before_impressions,
    SUM(
      IF(
        daily_rankings.date BETWEEN DATE_ADD(target_rewrites_with_urls.rewrite_date, INTERVAL 1 DAY)
        AND DATE_ADD(target_rewrites_with_urls.rewrite_date, INTERVAL @window_days DAY),
        daily_rankings.impressions,
        0
      )
    ) AS after_impressions,
    SAFE_DIVIDE(
      SUM(
        IF(
          daily_rankings.date BETWEEN DATE_SUB(target_rewrites_with_urls.rewrite_date, INTERVAL @window_days DAY)
          AND DATE_SUB(target_rewrites_with_urls.rewrite_date, INTERVAL 1 DAY),
          daily_rankings.clicks,
          0
        )
      ),
      NULLIF(
        SUM(
          IF(
            daily_rankings.date BETWEEN DATE_SUB(target_rewrites_with_urls.rewrite_date, INTERVAL @window_days DAY)
            AND DATE_SUB(target_rewrites_with_urls.rewrite_date, INTERVAL 1 DAY),
            daily_rankings.impressions,
            0
          )
        ),
        0
      )
    ) AS before_ctr,
    SAFE_DIVIDE(
      SUM(
        IF(
          daily_rankings.date BETWEEN DATE_ADD(target_rewrites_with_urls.rewrite_date, INTERVAL 1 DAY)
          AND DATE_ADD(target_rewrites_with_urls.rewrite_date, INTERVAL @window_days DAY),
          daily_rankings.clicks,
          0
        )
      ),
      NULLIF(
        SUM(
          IF(
            daily_rankings.date BETWEEN DATE_ADD(target_rewrites_with_urls.rewrite_date, INTERVAL 1 DAY)
            AND DATE_ADD(target_rewrites_with_urls.rewrite_date, INTERVAL @window_days DAY),
            daily_rankings.impressions,
            0
          )
        ),
        0
      )
    ) AS after_ctr,
    COUNT(DISTINCT IF(
      daily_rankings.date BETWEEN DATE_SUB(target_rewrites_with_urls.rewrite_date, INTERVAL @window_days DAY)
      AND DATE_SUB(target_rewrites_with_urls.rewrite_date, INTERVAL 1 DAY),
      daily_rankings.date,
      NULL
    )) AS before_days_with_data,
    COUNT(DISTINCT IF(
      daily_rankings.date BETWEEN DATE_ADD(target_rewrites_with_urls.rewrite_date, INTERVAL 1 DAY)
      AND DATE_ADD(target_rewrites_with_urls.rewrite_date, INTERVAL @window_days DAY),
      daily_rankings.date,
      NULL
    )) AS after_days_with_data
  FROM target_rewrites_with_urls
  LEFT JOIN `${PROJECT_ID}.${DATASET}.daily_rankings` AS daily_rankings
    ON daily_rankings.url IN UNNEST(target_rewrites_with_urls.candidate_urls)
    AND daily_rankings.date BETWEEN DATE_SUB(target_rewrites_with_urls.rewrite_date, INTERVAL @window_days DAY)
    AND DATE_ADD(target_rewrites_with_urls.rewrite_date, INTERVAL @window_days DAY)
  GROUP BY target_rewrites_with_urls.id
),
scored_rewrites AS (
  SELECT
    target_rewrites_with_urls.id,
    target_rewrites_with_urls.wp_post_id,
    target_rewrites_with_urls.wp_post_url,
    target_rewrites_with_urls.wp_post_slug,
    target_rewrites_with_urls.wp_post_title,
    target_rewrites_with_urls.wp_post_status,
    target_rewrites_with_urls.url,
    target_rewrites_with_urls.rewrite_date,
    target_rewrites_with_urls.rewrite_type,
    target_rewrites_with_urls.summary,
    ranking_metrics.before_average_position,
    ranking_metrics.after_average_position,
    ranking_metrics.before_clicks,
    ranking_metrics.after_clicks,
    ranking_metrics.before_impressions,
    ranking_metrics.after_impressions,
    ranking_metrics.before_ctr,
    ranking_metrics.after_ctr,
    ranking_metrics.before_days_with_data,
    ranking_metrics.after_days_with_data,
    ARRAY_LENGTH(target_rewrites_with_urls.candidate_urls) AS candidate_url_count,
    CASE
      WHEN ranking_metrics.before_average_position IS NULL
        OR ranking_metrics.after_average_position IS NULL THEN NULL
      ELSE ranking_metrics.before_average_position - ranking_metrics.after_average_position
    END AS position_delta,
    COALESCE(ranking_metrics.after_clicks, 0) - COALESCE(ranking_metrics.before_clicks, 0)
      AS clicks_delta,
    COALESCE(ranking_metrics.after_impressions, 0)
      - COALESCE(ranking_metrics.before_impressions, 0) AS impressions_delta,
    CASE
      WHEN ranking_metrics.before_ctr IS NULL OR ranking_metrics.after_ctr IS NULL THEN NULL
      ELSE ranking_metrics.after_ctr - ranking_metrics.before_ctr
    END AS ctr_delta,
    (
      CASE
        WHEN ranking_metrics.before_average_position IS NULL
          OR ranking_metrics.after_average_position IS NULL THEN 0
        WHEN ranking_metrics.before_average_position - ranking_metrics.after_average_position >= 1 THEN 2
        WHEN ranking_metrics.before_average_position - ranking_metrics.after_average_position > 0.2 THEN 1
        WHEN ranking_metrics.before_average_position - ranking_metrics.after_average_position <= -1 THEN -2
        WHEN ranking_metrics.before_average_position - ranking_metrics.after_average_position < -0.2 THEN -1
        ELSE 0
      END
      + CASE
        WHEN COALESCE(ranking_metrics.after_clicks, 0)
          - COALESCE(ranking_metrics.before_clicks, 0)
          >= GREATEST(
            5,
            CAST(ROUND(COALESCE(ranking_metrics.before_clicks, 0) * 0.1) AS INT64)
          ) THEN 1
        WHEN COALESCE(ranking_metrics.after_clicks, 0)
          - COALESCE(ranking_metrics.before_clicks, 0)
          <= -GREATEST(
            5,
            CAST(ROUND(COALESCE(ranking_metrics.before_clicks, 0) * 0.1) AS INT64)
          ) THEN -1
        ELSE 0
      END
      + CASE
        WHEN COALESCE(ranking_metrics.after_impressions, 0)
          - COALESCE(ranking_metrics.before_impressions, 0)
          >= GREATEST(
            50,
            CAST(ROUND(COALESCE(ranking_metrics.before_impressions, 0) * 0.1) AS INT64)
          ) THEN 1
        WHEN COALESCE(ranking_metrics.after_impressions, 0)
          - COALESCE(ranking_metrics.before_impressions, 0)
          <= -GREATEST(
            50,
            CAST(ROUND(COALESCE(ranking_metrics.before_impressions, 0) * 0.1) AS INT64)
          ) THEN -1
        ELSE 0
      END
      + CASE
        WHEN ranking_metrics.before_ctr IS NULL OR ranking_metrics.after_ctr IS NULL THEN 0
        WHEN ranking_metrics.after_ctr - ranking_metrics.before_ctr >= 0.005 THEN 1
        WHEN ranking_metrics.after_ctr - ranking_metrics.before_ctr <= -0.005 THEN -1
        ELSE 0
      END
    ) AS evaluation_score
  FROM target_rewrites_with_urls
  LEFT JOIN ranking_metrics
    ON ranking_metrics.id = target_rewrites_with_urls.id
)
SELECT
  scored_rewrites.id,
  scored_rewrites.wp_post_id,
  scored_rewrites.wp_post_url,
  scored_rewrites.wp_post_slug,
  scored_rewrites.wp_post_title,
  scored_rewrites.wp_post_status,
  scored_rewrites.url,
  scored_rewrites.rewrite_date,
  scored_rewrites.rewrite_type,
  scored_rewrites.summary,
  scored_rewrites.before_average_position,
  scored_rewrites.after_average_position,
  scored_rewrites.before_clicks,
  scored_rewrites.after_clicks,
  scored_rewrites.before_impressions,
  scored_rewrites.after_impressions,
  scored_rewrites.before_ctr,
  scored_rewrites.after_ctr,
  scored_rewrites.before_days_with_data,
  scored_rewrites.after_days_with_data,
  scored_rewrites.position_delta,
  scored_rewrites.clicks_delta,
  scored_rewrites.impressions_delta,
  scored_rewrites.ctr_delta,
  scored_rewrites.evaluation_score,
  CASE
    WHEN scored_rewrites.before_days_with_data = 0
      OR scored_rewrites.after_days_with_data = 0 THEN 'insufficient_data'
    WHEN scored_rewrites.before_days_with_data < CAST(CEIL(@window_days * 0.7) AS INT64)
      OR scored_rewrites.after_days_with_data < CAST(CEIL(@window_days * 0.7) AS INT64)
      OR GREATEST(
        COALESCE(scored_rewrites.before_impressions, 0),
        COALESCE(scored_rewrites.after_impressions, 0)
      ) < 100 THEN 'needs_review'
    WHEN scored_rewrites.evaluation_score >= 3 THEN 'positive'
    WHEN scored_rewrites.evaluation_score <= -2 THEN 'negative'
    ELSE 'mixed'
  END AS evaluation_label,
  ARRAY_CONCAT(
    IF(
      scored_rewrites.before_days_with_data = 0
        OR scored_rewrites.after_days_with_data = 0,
      ['前後どちらかの比較窓に daily_rankings がありません。'],
      ARRAY<STRING>[]
    ),
    IF(
      scored_rewrites.before_days_with_data < CAST(CEIL(@window_days * 0.7) AS INT64)
        OR scored_rewrites.after_days_with_data < CAST(CEIL(@window_days * 0.7) AS INT64),
      [FORMAT('比較窓 %d 日に対して日次データが不足しています。', @window_days)],
      ARRAY<STRING>[]
    ),
    IF(
      GREATEST(
        COALESCE(scored_rewrites.before_impressions, 0),
        COALESCE(scored_rewrites.after_impressions, 0)
      ) < 100,
      ['impressions が少なく、前後差の誤差が大きい可能性があります。'],
      ARRAY<STRING>[]
    ),
    IF(
      scored_rewrites.candidate_url_count > 1,
      ['URL 変更をまたいで記事単位で集計しています。'],
      ARRAY<STRING>[]
    )
  ) AS evaluation_notes
FROM scored_rewrites
ORDER BY scored_rewrites.rewrite_date DESC, scored_rewrites.url ASC;
