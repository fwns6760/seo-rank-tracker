MERGE `${PROJECT_ID}.${DATASET}.tracked_keywords` AS target
USING (
  SELECT
    COALESCE(@original_keyword, @keyword) AS match_keyword,
    COALESCE(@original_target_url, @target_url) AS match_target_url,
    @keyword AS keyword,
    @target_url AS target_url,
    @category AS category,
    @pillar AS pillar,
    @cluster AS cluster,
    @intent AS intent,
    @priority AS priority,
    @is_active AS is_active,
    @created_at AS created_at,
    @updated_at AS updated_at
) AS source
ON target.keyword = source.match_keyword
  AND target.target_url = source.match_target_url
WHEN MATCHED THEN
  UPDATE SET
    keyword = source.keyword,
    target_url = source.target_url,
    category = source.category,
    pillar = source.pillar,
    cluster = source.cluster,
    intent = source.intent,
    priority = source.priority,
    is_active = source.is_active,
    updated_at = source.updated_at
WHEN NOT MATCHED THEN
  INSERT (
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
  )
  VALUES (
    source.keyword,
    source.target_url,
    source.category,
    source.pillar,
    source.cluster,
    source.intent,
    source.priority,
    source.is_active,
    source.created_at,
    source.updated_at
  );
