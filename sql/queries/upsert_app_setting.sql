MERGE `${PROJECT_ID}.${DATASET}.app_settings` AS target
USING (
  SELECT
    @setting_key AS setting_key,
    @setting_value AS setting_value,
    @created_at AS created_at,
    @updated_at AS updated_at
) AS source
ON target.setting_key = source.setting_key
WHEN MATCHED THEN
  UPDATE SET
    setting_value = source.setting_value,
    updated_at = source.updated_at
WHEN NOT MATCHED THEN
  INSERT (
    setting_key,
    setting_value,
    created_at,
    updated_at
  )
  VALUES (
    source.setting_key,
    source.setting_value,
    source.created_at,
    source.updated_at
  );
