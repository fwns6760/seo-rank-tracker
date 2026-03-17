import { runNamedQuery } from "@/lib/bq/query-runner";
import type { AppSettingRow, TrackedKeywordRow } from "@/lib/bq/types";
import {
  appSettingKeys,
  getDefaultOperationalSettings,
  type AppSettingKey,
  type OperationalSettings,
  type WordPressAuthMode,
} from "@/lib/settings/config";
import type { TrackedKeywordInput } from "@/lib/validators/settings";

function readNumber(value: string | undefined, fallback: number) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return fallback;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) ? numeric : fallback;
}

function readString(value: string | undefined, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  return value;
}

function readWordPressAuthMode(
  value: string | undefined,
  fallback: WordPressAuthMode,
): WordPressAuthMode {
  return value === "basic" || value === "none" ? value : fallback;
}

/**
 * Returns tracked keyword rows for the settings screen.
 */
export async function getTrackedKeywords({
  keywordSearch,
  targetUrlSearch,
  pillarSearch,
  clusterSearch,
  statusFilter,
  limit = 50,
}: {
  keywordSearch?: string | null;
  targetUrlSearch?: string | null;
  pillarSearch?: string | null;
  clusterSearch?: string | null;
  statusFilter?: boolean | null;
  limit?: number;
}) {
  return runNamedQuery<TrackedKeywordRow>("tracked_keyword_list", {
    keyword_search: keywordSearch?.trim() ? keywordSearch.trim() : null,
    target_url_search: targetUrlSearch?.trim() ? targetUrlSearch.trim() : null,
    pillar_search: pillarSearch?.trim() ? pillarSearch.trim() : null,
    cluster_search: clusterSearch?.trim() ? clusterSearch.trim() : null,
    status_filter: statusFilter ?? null,
    limit,
  });
}

/**
 * Upserts one tracked keyword row using keyword + target_url as the logical key.
 */
export async function upsertTrackedKeyword(input: TrackedKeywordInput) {
  const now = new Date().toISOString();

  await runNamedQuery<Record<string, never>>("upsert_tracked_keyword", {
    original_keyword: input.originalKeyword ?? null,
    original_target_url: input.originalTargetUrl ?? null,
    keyword: input.keyword,
    target_url: input.targetUrl,
    category: input.category,
    pillar: input.pillar,
    cluster: input.cluster,
    intent: input.intent,
    priority: input.priority,
    is_active: input.isActive,
    created_at: now,
    updated_at: now,
  });

  return {
    keyword: input.keyword,
    target_url: input.targetUrl,
    category: input.category,
    pillar: input.pillar,
    cluster: input.cluster,
    intent: input.intent,
    priority: input.priority,
    is_active: input.isActive,
    created_at: now,
    updated_at: now,
  } satisfies TrackedKeywordRow;
}

/**
 * Returns persisted operational settings merged with default fallbacks.
 */
export async function getOperationalSettings() {
  const rows = await runNamedQuery<AppSettingRow>("app_settings_list", {
    setting_keys: [...appSettingKeys],
  });
  const defaults = getDefaultOperationalSettings();
  const values = new Map<AppSettingKey, string>();

  rows.forEach((row) => {
    values.set(row.setting_key as AppSettingKey, row.setting_value ?? "");
  });

  const resolved: OperationalSettings = {
    alertDropThreshold: readNumber(
      values.get("alert_drop_threshold"),
      defaults.alertDropThreshold,
    ),
    alertRiseThreshold: readNumber(
      values.get("alert_rise_threshold"),
      defaults.alertRiseThreshold,
    ),
    rewriteCandidateMinImpressions: readNumber(
      values.get("rewrite_candidate_min_impressions"),
      defaults.rewriteCandidateMinImpressions,
    ),
    slackWebhookUrl:
      values.get("slack_webhook_url") ?? defaults.slackWebhookUrl,
    schedulerTimeJst:
      values.get("scheduler_time_jst") ?? defaults.schedulerTimeJst,
    targetSiteHost:
      values.get("target_site_host") ?? defaults.targetSiteHost,
    wordpressBaseUrl: readString(
      values.get("wordpress_base_url"),
      defaults.wordpressBaseUrl,
    ),
    wordpressAuthMode: readWordPressAuthMode(
      values.get("wordpress_auth_mode"),
      defaults.wordpressAuthMode,
    ),
    wordpressUsername: readString(
      values.get("wordpress_username"),
      defaults.wordpressUsername,
    ),
    wordpressApplicationPasswordSecretName: readString(
      values.get("wordpress_application_password_secret_name"),
      defaults.wordpressApplicationPasswordSecretName,
    ),
    wordpressPostType: readString(
      values.get("wordpress_post_type"),
      defaults.wordpressPostType,
    ),
    wordpressPostStatuses: readString(
      values.get("wordpress_post_statuses"),
      defaults.wordpressPostStatuses,
    ),
  };

  return {
    rows,
    values: resolved,
  };
}

/**
 * Upserts a set of operational settings into app_settings.
 */
export async function upsertOperationalSettings(
  entries: Record<AppSettingKey, string>,
) {
  const now = new Date().toISOString();

  for (const [settingKey, settingValue] of Object.entries(entries)) {
    await runNamedQuery<Record<string, never>>("upsert_app_setting", {
      setting_key: settingKey,
      setting_value: settingValue,
      created_at: now,
      updated_at: now,
    });
  }
}
