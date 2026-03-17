SELECT
  keyword,
  target_url,
  category,
  pillar,
  cluster,
  intent,
  priority,
  is_active,
  created_at,
  updated_at
FROM `${PROJECT_ID}.${DATASET}.tracked_keywords`
WHERE (@keyword_search IS NULL OR LOWER(keyword) LIKE CONCAT('%', LOWER(@keyword_search), '%'))
  AND (@target_url_search IS NULL OR LOWER(target_url) LIKE CONCAT('%', LOWER(@target_url_search), '%'))
  AND (@pillar_search IS NULL OR LOWER(COALESCE(pillar, '')) LIKE CONCAT('%', LOWER(@pillar_search), '%'))
  AND (@cluster_search IS NULL OR LOWER(COALESCE(cluster, '')) LIKE CONCAT('%', LOWER(@cluster_search), '%'))
  AND (@status_filter IS NULL OR is_active = @status_filter)
ORDER BY is_active DESC, updated_at DESC, keyword ASC
LIMIT @limit;
