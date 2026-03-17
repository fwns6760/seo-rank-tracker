SELECT COUNT(*) AS existing_rows
FROM `{staging_table}` AS source
JOIN `{target_table}` AS target
  ON target.wp_post_id = source.wp_post_id;
