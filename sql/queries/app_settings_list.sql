SELECT
  setting_key,
  setting_value,
  created_at,
  updated_at
FROM `${PROJECT_ID}.${DATASET}.app_settings`
WHERE setting_key IN UNNEST(@setting_keys)
ORDER BY setting_key ASC;
