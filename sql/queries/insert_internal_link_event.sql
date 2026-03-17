INSERT INTO `${PROJECT_ID}.${DATASET}.internal_link_events` (
  id,
  wp_post_id,
  url,
  change_date,
  summary,
  memo,
  created_at,
  updated_at
)
VALUES (
  @id,
  @wp_post_id,
  @url,
  @change_date,
  @summary,
  @memo,
  @created_at,
  @updated_at
);
