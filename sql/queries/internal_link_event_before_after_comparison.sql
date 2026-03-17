WITH resolved_events AS (
  SELECT
    events.id,
    COALESCE(post_by_id.wp_post_id, post_by_url.wp_post_id, events.wp_post_id) AS wp_post_id,
    events.url,
    events.change_date,
    events.summary,
    events.updated_at,
    COALESCE(post_by_id.url, post_by_url.url) AS wp_post_url,
    COALESCE(post_by_id.slug, post_by_url.slug) AS wp_post_slug,
    COALESCE(post_by_id.title, post_by_url.title) AS wp_post_title,
    COALESCE(post_by_id.post_status, post_by_url.post_status) AS wp_post_status
  FROM `${PROJECT_ID}.${DATASET}.internal_link_events` AS events
  LEFT JOIN `${PROJECT_ID}.${DATASET}.wp_posts` AS post_by_id
    ON post_by_id.wp_post_id = events.wp_post_id
  LEFT JOIN `${PROJECT_ID}.${DATASET}.wp_posts` AS post_by_url
    ON events.wp_post_id IS NULL
    AND post_by_url.url = events.url
  WHERE events.change_date BETWEEN @start_date AND @end_date
),
target_events AS (
  SELECT
    id,
    wp_post_id,
    wp_post_url,
    wp_post_slug,
    wp_post_title,
    wp_post_status,
    url,
    change_date,
    summary,
    updated_at
  FROM resolved_events
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
          AND tracked_keywords.target_url = COALESCE(resolved_events.wp_post_url, resolved_events.url)
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
  ORDER BY change_date DESC, updated_at DESC
  LIMIT @limit
),
target_events_with_urls AS (
  SELECT
    target_events.*,
    ARRAY(
      SELECT DISTINCT candidate_url
      FROM UNNEST(
        ARRAY_CONCAT(
          IF(target_events.url IS NULL, ARRAY<STRING>[], [target_events.url]),
          IF(
            target_events.wp_post_url IS NULL,
            ARRAY<STRING>[],
            [target_events.wp_post_url]
          ),
          IF(
            target_events.wp_post_id IS NULL,
            ARRAY<STRING>[],
            ARRAY(
              SELECT historical.url
              FROM resolved_events AS historical
              WHERE historical.wp_post_id = target_events.wp_post_id
                AND historical.url IS NOT NULL
            )
          )
        )
      ) AS candidate_url
      WHERE candidate_url IS NOT NULL
    ) AS candidate_urls
  FROM target_events
),
ranking_metrics AS (
  SELECT
    target_events_with_urls.id,
    AVG(
      IF(
        daily_rankings.date BETWEEN DATE_SUB(target_events_with_urls.change_date, INTERVAL @window_days DAY)
        AND DATE_SUB(target_events_with_urls.change_date, INTERVAL 1 DAY),
        daily_rankings.position,
        NULL
      )
    ) AS before_average_position,
    AVG(
      IF(
        daily_rankings.date BETWEEN DATE_ADD(target_events_with_urls.change_date, INTERVAL 1 DAY)
        AND DATE_ADD(target_events_with_urls.change_date, INTERVAL @window_days DAY),
        daily_rankings.position,
        NULL
      )
    ) AS after_average_position,
    SUM(
      IF(
        daily_rankings.date BETWEEN DATE_SUB(target_events_with_urls.change_date, INTERVAL @window_days DAY)
        AND DATE_SUB(target_events_with_urls.change_date, INTERVAL 1 DAY),
        daily_rankings.clicks,
        0
      )
    ) AS before_clicks,
    SUM(
      IF(
        daily_rankings.date BETWEEN DATE_ADD(target_events_with_urls.change_date, INTERVAL 1 DAY)
        AND DATE_ADD(target_events_with_urls.change_date, INTERVAL @window_days DAY),
        daily_rankings.clicks,
        0
      )
    ) AS after_clicks,
    SUM(
      IF(
        daily_rankings.date BETWEEN DATE_SUB(target_events_with_urls.change_date, INTERVAL @window_days DAY)
        AND DATE_SUB(target_events_with_urls.change_date, INTERVAL 1 DAY),
        daily_rankings.impressions,
        0
      )
    ) AS before_impressions,
    SUM(
      IF(
        daily_rankings.date BETWEEN DATE_ADD(target_events_with_urls.change_date, INTERVAL 1 DAY)
        AND DATE_ADD(target_events_with_urls.change_date, INTERVAL @window_days DAY),
        daily_rankings.impressions,
        0
      )
    ) AS after_impressions,
    SAFE_DIVIDE(
      SUM(
        IF(
          daily_rankings.date BETWEEN DATE_SUB(target_events_with_urls.change_date, INTERVAL @window_days DAY)
          AND DATE_SUB(target_events_with_urls.change_date, INTERVAL 1 DAY),
          daily_rankings.clicks,
          0
        )
      ),
      NULLIF(
        SUM(
          IF(
            daily_rankings.date BETWEEN DATE_SUB(target_events_with_urls.change_date, INTERVAL @window_days DAY)
            AND DATE_SUB(target_events_with_urls.change_date, INTERVAL 1 DAY),
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
          daily_rankings.date BETWEEN DATE_ADD(target_events_with_urls.change_date, INTERVAL 1 DAY)
          AND DATE_ADD(target_events_with_urls.change_date, INTERVAL @window_days DAY),
          daily_rankings.clicks,
          0
        )
      ),
      NULLIF(
        SUM(
          IF(
            daily_rankings.date BETWEEN DATE_ADD(target_events_with_urls.change_date, INTERVAL 1 DAY)
            AND DATE_ADD(target_events_with_urls.change_date, INTERVAL @window_days DAY),
            daily_rankings.impressions,
            0
          )
        ),
        0
      )
    ) AS after_ctr,
    COUNT(DISTINCT IF(
      daily_rankings.date BETWEEN DATE_SUB(target_events_with_urls.change_date, INTERVAL @window_days DAY)
      AND DATE_SUB(target_events_with_urls.change_date, INTERVAL 1 DAY),
      daily_rankings.date,
      NULL
    )) AS before_days_with_data,
    COUNT(DISTINCT IF(
      daily_rankings.date BETWEEN DATE_ADD(target_events_with_urls.change_date, INTERVAL 1 DAY)
      AND DATE_ADD(target_events_with_urls.change_date, INTERVAL @window_days DAY),
      daily_rankings.date,
      NULL
    )) AS after_days_with_data
  FROM target_events_with_urls
  LEFT JOIN `${PROJECT_ID}.${DATASET}.daily_rankings` AS daily_rankings
    ON daily_rankings.url IN UNNEST(target_events_with_urls.candidate_urls)
    AND daily_rankings.date BETWEEN DATE_SUB(target_events_with_urls.change_date, INTERVAL @window_days DAY)
    AND DATE_ADD(target_events_with_urls.change_date, INTERVAL @window_days DAY)
  GROUP BY target_events_with_urls.id
),
before_crawl_dates AS (
  SELECT
    target_events_with_urls.id,
    MAX(internal_links.crawl_date) AS before_crawl_date
  FROM target_events_with_urls
  LEFT JOIN `${PROJECT_ID}.${DATASET}.internal_links` AS internal_links
    ON internal_links.crawl_date BETWEEN DATE_SUB(target_events_with_urls.change_date, INTERVAL @window_days DAY)
    AND DATE_SUB(target_events_with_urls.change_date, INTERVAL 1 DAY)
    AND (
      internal_links.source_url IN UNNEST(target_events_with_urls.candidate_urls)
      OR internal_links.target_url IN UNNEST(target_events_with_urls.candidate_urls)
    )
  GROUP BY target_events_with_urls.id
),
after_crawl_dates AS (
  SELECT
    target_events_with_urls.id,
    MIN(internal_links.crawl_date) AS after_crawl_date
  FROM target_events_with_urls
  LEFT JOIN `${PROJECT_ID}.${DATASET}.internal_links` AS internal_links
    ON internal_links.crawl_date BETWEEN DATE_ADD(target_events_with_urls.change_date, INTERVAL 1 DAY)
    AND DATE_ADD(target_events_with_urls.change_date, INTERVAL @window_days DAY)
    AND (
      internal_links.source_url IN UNNEST(target_events_with_urls.candidate_urls)
      OR internal_links.target_url IN UNNEST(target_events_with_urls.candidate_urls)
    )
  GROUP BY target_events_with_urls.id
),
before_link_metrics AS (
  SELECT
    target_events_with_urls.id,
    before_crawl_dates.before_crawl_date,
    COUNTIF(internal_links.source_url IN UNNEST(target_events_with_urls.candidate_urls))
      AS before_outgoing_links,
    COUNTIF(internal_links.target_url IN UNNEST(target_events_with_urls.candidate_urls))
      AS before_incoming_links,
    COUNTIF(
      internal_links.source_url IN UNNEST(target_events_with_urls.candidate_urls)
      AND internal_links.status_code = 404
    ) AS before_broken_outgoing_links,
    COUNTIF(
      internal_links.target_url IN UNNEST(target_events_with_urls.candidate_urls)
      AND internal_links.status_code = 404
    ) AS before_broken_incoming_links
  FROM target_events_with_urls
  LEFT JOIN before_crawl_dates
    ON before_crawl_dates.id = target_events_with_urls.id
  LEFT JOIN `${PROJECT_ID}.${DATASET}.internal_links` AS internal_links
    ON internal_links.crawl_date = before_crawl_dates.before_crawl_date
    AND (
      internal_links.source_url IN UNNEST(target_events_with_urls.candidate_urls)
      OR internal_links.target_url IN UNNEST(target_events_with_urls.candidate_urls)
    )
  GROUP BY target_events_with_urls.id, before_crawl_dates.before_crawl_date
),
after_link_metrics AS (
  SELECT
    target_events_with_urls.id,
    after_crawl_dates.after_crawl_date,
    COUNTIF(internal_links.source_url IN UNNEST(target_events_with_urls.candidate_urls))
      AS after_outgoing_links,
    COUNTIF(internal_links.target_url IN UNNEST(target_events_with_urls.candidate_urls))
      AS after_incoming_links,
    COUNTIF(
      internal_links.source_url IN UNNEST(target_events_with_urls.candidate_urls)
      AND internal_links.status_code = 404
    ) AS after_broken_outgoing_links,
    COUNTIF(
      internal_links.target_url IN UNNEST(target_events_with_urls.candidate_urls)
      AND internal_links.status_code = 404
    ) AS after_broken_incoming_links
  FROM target_events_with_urls
  LEFT JOIN after_crawl_dates
    ON after_crawl_dates.id = target_events_with_urls.id
  LEFT JOIN `${PROJECT_ID}.${DATASET}.internal_links` AS internal_links
    ON internal_links.crawl_date = after_crawl_dates.after_crawl_date
    AND (
      internal_links.source_url IN UNNEST(target_events_with_urls.candidate_urls)
      OR internal_links.target_url IN UNNEST(target_events_with_urls.candidate_urls)
    )
  GROUP BY target_events_with_urls.id, after_crawl_dates.after_crawl_date
),
scored_events AS (
  SELECT
    target_events_with_urls.id,
    target_events_with_urls.wp_post_id,
    target_events_with_urls.wp_post_url,
    target_events_with_urls.wp_post_slug,
    target_events_with_urls.wp_post_title,
    target_events_with_urls.wp_post_status,
    target_events_with_urls.url,
    target_events_with_urls.change_date,
    target_events_with_urls.summary,
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
    before_link_metrics.before_crawl_date,
    after_link_metrics.after_crawl_date,
    COALESCE(before_link_metrics.before_incoming_links, 0) AS before_incoming_links,
    COALESCE(after_link_metrics.after_incoming_links, 0) AS after_incoming_links,
    COALESCE(before_link_metrics.before_outgoing_links, 0) AS before_outgoing_links,
    COALESCE(after_link_metrics.after_outgoing_links, 0) AS after_outgoing_links,
    COALESCE(before_link_metrics.before_broken_incoming_links, 0)
      AS before_broken_incoming_links,
    COALESCE(after_link_metrics.after_broken_incoming_links, 0)
      AS after_broken_incoming_links,
    COALESCE(before_link_metrics.before_broken_outgoing_links, 0)
      AS before_broken_outgoing_links,
    COALESCE(after_link_metrics.after_broken_outgoing_links, 0)
      AS after_broken_outgoing_links,
    ARRAY_LENGTH(target_events_with_urls.candidate_urls) AS candidate_url_count,
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
    COALESCE(after_link_metrics.after_incoming_links, 0)
      - COALESCE(before_link_metrics.before_incoming_links, 0) AS incoming_links_delta,
    COALESCE(after_link_metrics.after_outgoing_links, 0)
      - COALESCE(before_link_metrics.before_outgoing_links, 0) AS outgoing_links_delta,
    (
      COALESCE(after_link_metrics.after_incoming_links, 0)
      + COALESCE(after_link_metrics.after_outgoing_links, 0)
    ) - (
      COALESCE(before_link_metrics.before_incoming_links, 0)
      + COALESCE(before_link_metrics.before_outgoing_links, 0)
    ) AS total_link_delta,
    (
      COALESCE(after_link_metrics.after_broken_incoming_links, 0)
      + COALESCE(after_link_metrics.after_broken_outgoing_links, 0)
    ) - (
      COALESCE(before_link_metrics.before_broken_incoming_links, 0)
      + COALESCE(before_link_metrics.before_broken_outgoing_links, 0)
    ) AS broken_links_delta,
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
        WHEN ranking_metrics.before_ctr IS NULL OR ranking_metrics.after_ctr IS NULL THEN 0
        WHEN ranking_metrics.after_ctr - ranking_metrics.before_ctr >= 0.005 THEN 1
        WHEN ranking_metrics.after_ctr - ranking_metrics.before_ctr <= -0.005 THEN -1
        ELSE 0
      END
      + CASE
        WHEN (
          COALESCE(after_link_metrics.after_incoming_links, 0)
          + COALESCE(after_link_metrics.after_outgoing_links, 0)
        ) - (
          COALESCE(before_link_metrics.before_incoming_links, 0)
          + COALESCE(before_link_metrics.before_outgoing_links, 0)
        ) > 0 THEN 1
        WHEN (
          COALESCE(after_link_metrics.after_incoming_links, 0)
          + COALESCE(after_link_metrics.after_outgoing_links, 0)
        ) - (
          COALESCE(before_link_metrics.before_incoming_links, 0)
          + COALESCE(before_link_metrics.before_outgoing_links, 0)
        ) < 0 THEN -1
        ELSE 0
      END
      + CASE
        WHEN (
          COALESCE(after_link_metrics.after_broken_incoming_links, 0)
          + COALESCE(after_link_metrics.after_broken_outgoing_links, 0)
        ) - (
          COALESCE(before_link_metrics.before_broken_incoming_links, 0)
          + COALESCE(before_link_metrics.before_broken_outgoing_links, 0)
        ) < 0 THEN 1
        WHEN (
          COALESCE(after_link_metrics.after_broken_incoming_links, 0)
          + COALESCE(after_link_metrics.after_broken_outgoing_links, 0)
        ) - (
          COALESCE(before_link_metrics.before_broken_incoming_links, 0)
          + COALESCE(before_link_metrics.before_broken_outgoing_links, 0)
        ) > 0 THEN -1
        ELSE 0
      END
    ) AS evaluation_score
  FROM target_events_with_urls
  LEFT JOIN ranking_metrics
    ON ranking_metrics.id = target_events_with_urls.id
  LEFT JOIN before_link_metrics
    ON before_link_metrics.id = target_events_with_urls.id
  LEFT JOIN after_link_metrics
    ON after_link_metrics.id = target_events_with_urls.id
)
SELECT
  scored_events.id,
  scored_events.wp_post_id,
  scored_events.wp_post_url,
  scored_events.wp_post_slug,
  scored_events.wp_post_title,
  scored_events.wp_post_status,
  scored_events.url,
  scored_events.change_date,
  scored_events.summary,
  scored_events.before_average_position,
  scored_events.after_average_position,
  scored_events.before_clicks,
  scored_events.after_clicks,
  scored_events.before_impressions,
  scored_events.after_impressions,
  scored_events.before_ctr,
  scored_events.after_ctr,
  scored_events.before_days_with_data,
  scored_events.after_days_with_data,
  scored_events.before_crawl_date,
  scored_events.after_crawl_date,
  scored_events.before_incoming_links,
  scored_events.after_incoming_links,
  scored_events.before_outgoing_links,
  scored_events.after_outgoing_links,
  scored_events.before_broken_incoming_links,
  scored_events.after_broken_incoming_links,
  scored_events.before_broken_outgoing_links,
  scored_events.after_broken_outgoing_links,
  scored_events.position_delta,
  scored_events.clicks_delta,
  scored_events.impressions_delta,
  scored_events.ctr_delta,
  scored_events.incoming_links_delta,
  scored_events.outgoing_links_delta,
  scored_events.total_link_delta,
  scored_events.broken_links_delta,
  scored_events.evaluation_score,
  CASE
    WHEN scored_events.before_days_with_data = 0
      OR scored_events.after_days_with_data = 0 THEN 'insufficient_data'
    WHEN scored_events.before_crawl_date IS NULL
      OR scored_events.after_crawl_date IS NULL THEN 'needs_review'
    WHEN scored_events.before_days_with_data < CAST(CEIL(@window_days * 0.7) AS INT64)
      OR scored_events.after_days_with_data < CAST(CEIL(@window_days * 0.7) AS INT64)
      OR GREATEST(
        COALESCE(scored_events.before_impressions, 0),
        COALESCE(scored_events.after_impressions, 0)
      ) < 100 THEN 'needs_review'
    WHEN scored_events.evaluation_score >= 3 THEN 'positive'
    WHEN scored_events.evaluation_score <= -2 THEN 'negative'
    ELSE 'mixed'
  END AS evaluation_label,
  ARRAY_CONCAT(
    IF(
      scored_events.before_days_with_data = 0
        OR scored_events.after_days_with_data = 0,
      ['前後どちらかの比較窓に daily_rankings がありません。'],
      ARRAY<STRING>[]
    ),
    IF(
      scored_events.before_days_with_data < CAST(CEIL(@window_days * 0.7) AS INT64)
        OR scored_events.after_days_with_data < CAST(CEIL(@window_days * 0.7) AS INT64),
      [FORMAT('比較窓 %d 日に対して日次データが不足しています。', @window_days)],
      ARRAY<STRING>[]
    ),
    IF(
      scored_events.before_crawl_date IS NULL,
      ['change_date より前の internal_links crawl が比較窓内にありません。'],
      ARRAY<STRING>[]
    ),
    IF(
      scored_events.after_crawl_date IS NULL,
      ['change_date より後の internal_links crawl が比較窓内にありません。'],
      ARRAY<STRING>[]
    ),
    IF(
      GREATEST(
        COALESCE(scored_events.before_impressions, 0),
        COALESCE(scored_events.after_impressions, 0)
      ) < 100,
      ['impressions が少なく、前後差の誤差が大きい可能性があります。'],
      ARRAY<STRING>[]
    ),
    IF(
      scored_events.total_link_delta = 0 AND scored_events.broken_links_delta = 0,
      ['internal_links snapshot 上は件数差分が見つかりません。アンカー調整のみか、crawl 未反映の可能性があります。'],
      ARRAY<STRING>[]
    ),
    IF(
      scored_events.candidate_url_count > 1,
      ['URL 変更をまたいで記事単位で集計しています。'],
      ARRAY<STRING>[]
    )
  ) AS evaluation_notes
FROM scored_events
ORDER BY scored_events.change_date DESC, scored_events.url ASC;
