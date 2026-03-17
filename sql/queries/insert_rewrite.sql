INSERT INTO `${PROJECT_ID}.${DATASET}.rewrites` (
  id,
  wp_post_id,
  url,
  rewrite_date,
  rewrite_type,
  summary,
  memo,
  created_at,
  updated_at
)
VALUES (
  @id,
  @wp_post_id,
  @url,
  @rewrite_date,
  @rewrite_type,
  @summary,
  @memo,
  @created_at,
  @updated_at
);
