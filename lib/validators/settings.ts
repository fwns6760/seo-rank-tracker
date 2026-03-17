import {
  wordpressAuthModes,
  type AppSettingKey,
  type OperationalSettings,
  type WordPressAuthMode,
} from "@/lib/settings/config";

export const trackedKeywordPriorities = ["high", "medium", "low"] as const;
export const trackedKeywordIntents = [
  "informational",
  "commercial",
  "transactional",
  "navigational",
  "mixed",
] as const;

export class SettingsValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsValidationError";
  }
}

export type TrackedKeywordInput = {
  originalKeyword?: string | null;
  originalTargetUrl?: string | null;
  keyword: string;
  targetUrl: string;
  category: string | null;
  pillar: string | null;
  cluster: string | null;
  intent: string | null;
  priority: string | null;
  isActive: boolean;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUrl(value: string) {
  try {
    const parsed = new URL(value);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new SettingsValidationError("targetUrl must use http or https");
    }

    return parsed.toString();
  } catch (error) {
    if (error instanceof SettingsValidationError) {
      throw error;
    }

    throw new SettingsValidationError("targetUrl must be a valid absolute URL");
  }
}

function normalizeOptionalString(
  value: unknown,
  fieldName: string,
  maxLength: number,
) {
  const normalized = readString(value);

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new SettingsValidationError(
      `${fieldName} must be ${maxLength} characters or fewer`,
    );
  }

  return normalized;
}

function normalizeBoolean(value: unknown, fieldName: string) {
  if (typeof value === "boolean") {
    return value;
  }

  throw new SettingsValidationError(`${fieldName} must be a boolean`);
}

function normalizePositiveNumber(value: unknown, fieldName: string) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new SettingsValidationError(`${fieldName} must be a non-negative number`);
  }

  return numeric;
}

function normalizeTime(value: unknown) {
  const normalized = readString(value);

  if (!/^\d{2}:\d{2}$/.test(normalized)) {
    throw new SettingsValidationError("schedulerTimeJst must use HH:MM format");
  }

  const [hoursText, minutesText] = normalized.split(":");
  const hours = Number(hoursText);
  const minutes = Number(minutesText);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new SettingsValidationError("schedulerTimeJst must be a valid JST time");
  }

  return normalized;
}

function normalizeSlackWebhookUrl(value: unknown) {
  const normalized = readString(value);

  if (!normalized) {
    return "";
  }

  try {
    const parsed = new URL(normalized);

    if (parsed.protocol !== "https:") {
      throw new SettingsValidationError("slackWebhookUrl must use https");
    }

    return parsed.toString();
  } catch (error) {
    if (error instanceof SettingsValidationError) {
      throw error;
    }

    throw new SettingsValidationError("slackWebhookUrl must be a valid URL");
  }
}

function normalizeWordPressBaseUrl(value: unknown) {
  const normalized = readString(value);

  if (!normalized) {
    throw new SettingsValidationError("wordpressBaseUrl is required");
  }

  try {
    const parsed = new URL(normalized);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new SettingsValidationError("wordpressBaseUrl must use http or https");
    }

    return parsed.toString().replace(/\/$/, "");
  } catch (error) {
    if (error instanceof SettingsValidationError) {
      throw error;
    }

    throw new SettingsValidationError("wordpressBaseUrl must be a valid URL");
  }
}

function normalizeWordPressAuthMode(value: unknown): WordPressAuthMode {
  const normalized = readString(value);

  if (
    !wordpressAuthModes.includes(
      normalized as (typeof wordpressAuthModes)[number],
    )
  ) {
    throw new SettingsValidationError(
      `wordpressAuthMode must be one of: ${wordpressAuthModes.join(", ")}`,
    );
  }

  return normalized as WordPressAuthMode;
}

function normalizeSlugLikeValue(
  value: unknown,
  fieldName: string,
  { required = false }: { required?: boolean } = {},
) {
  const normalized = readString(value);

  if (!normalized) {
    if (required) {
      throw new SettingsValidationError(`${fieldName} is required`);
    }

    return "";
  }

  if (normalized.length > 120) {
    throw new SettingsValidationError(
      `${fieldName} must be 120 characters or fewer`,
    );
  }

  if (!/^[A-Za-z0-9._:/-]+$/.test(normalized)) {
    throw new SettingsValidationError(
      `${fieldName} contains unsupported characters`,
    );
  }

  return normalized;
}

function normalizeWordPressStatuses(value: unknown) {
  const normalized = readString(value);

  if (!normalized) {
    throw new SettingsValidationError("wordpressPostStatuses is required");
  }

  const statuses = Array.from(
    new Set(
      normalized
        .split(",")
        .map((status) => status.trim())
        .filter(Boolean),
    ),
  );

  if (statuses.length === 0) {
    throw new SettingsValidationError("wordpressPostStatuses is required");
  }

  statuses.forEach((status) => {
    if (!/^[A-Za-z0-9_-]+$/.test(status)) {
      throw new SettingsValidationError(
        "wordpressPostStatuses must be comma-separated slug values",
      );
    }
  });

  return statuses.join(",");
}

function normalizePriority(value: unknown) {
  const normalized = normalizeOptionalString(value, "priority", 80);

  if (!normalized) {
    return null;
  }

  if (!trackedKeywordPriorities.includes(normalized as (typeof trackedKeywordPriorities)[number])) {
    throw new SettingsValidationError(
      `priority must be one of: ${trackedKeywordPriorities.join(", ")}`,
    );
  }

  return normalized;
}

function normalizeTrackedKeywordIntent(value: unknown) {
  const normalized = normalizeOptionalString(value, "intent", 40);

  if (!normalized) {
    return null;
  }

  if (!trackedKeywordIntents.includes(normalized as (typeof trackedKeywordIntents)[number])) {
    throw new SettingsValidationError(
      `intent must be one of: ${trackedKeywordIntents.join(", ")}`,
    );
  }

  return normalized;
}

/**
 * Validates and normalizes one tracked-keyword upsert payload.
 */
export function normalizeTrackedKeywordInput(payload: unknown): TrackedKeywordInput {
  if (!payload || typeof payload !== "object") {
    throw new SettingsValidationError("tracked keyword payload must be an object");
  }

  const record = payload as Record<string, unknown>;
  const keyword = readString(record.keyword);

  if (!keyword) {
    throw new SettingsValidationError("keyword is required");
  }

  if (keyword.length > 300) {
    throw new SettingsValidationError("keyword must be 300 characters or fewer");
  }

  const pillar = normalizeOptionalString(record.pillar, "pillar", 120);
  const cluster = normalizeOptionalString(record.cluster, "cluster", 120);

  if (cluster && !pillar) {
    throw new SettingsValidationError("pillar is required when cluster is set");
  }

  return {
    originalKeyword: normalizeOptionalString(
      record.originalKeyword,
      "originalKeyword",
      300,
    ),
    originalTargetUrl: normalizeOptionalString(
      record.originalTargetUrl,
      "originalTargetUrl",
      1000,
    ),
    keyword,
    targetUrl: normalizeUrl(readString(record.targetUrl)),
    category: normalizeOptionalString(record.category, "category", 120),
    pillar,
    cluster,
    intent: normalizeTrackedKeywordIntent(record.intent),
    priority: normalizePriority(record.priority),
    isActive: normalizeBoolean(record.isActive, "isActive"),
  };
}

/**
 * Validates and normalizes one operational settings payload.
 */
export function normalizeOperationalSettingsInput(
  payload: unknown,
): OperationalSettings {
  if (!payload || typeof payload !== "object") {
    throw new SettingsValidationError("settings payload must be an object");
  }

  const record = payload as Record<string, unknown>;
  const targetSiteHost = readString(record.targetSiteHost);

  if (!targetSiteHost) {
    throw new SettingsValidationError("targetSiteHost is required");
  }

  const wordpressAuthMode = normalizeWordPressAuthMode(record.wordpressAuthMode);
  const wordpressUsername =
    normalizeOptionalString(record.wordpressUsername, "wordpressUsername", 120) ??
    "";
  const wordpressApplicationPasswordSecretName = normalizeSlugLikeValue(
    record.wordpressApplicationPasswordSecretName,
    "wordpressApplicationPasswordSecretName",
  );

  if (wordpressAuthMode === "basic") {
    if (!wordpressUsername) {
      throw new SettingsValidationError(
        "wordpressUsername is required when wordpressAuthMode=basic",
      );
    }

    if (!wordpressApplicationPasswordSecretName) {
      throw new SettingsValidationError(
        "wordpressApplicationPasswordSecretName is required when wordpressAuthMode=basic",
      );
    }
  }

  return {
    alertDropThreshold: normalizePositiveNumber(
      record.alertDropThreshold,
      "alertDropThreshold",
    ),
    alertRiseThreshold: normalizePositiveNumber(
      record.alertRiseThreshold,
      "alertRiseThreshold",
    ),
    rewriteCandidateMinImpressions: normalizePositiveNumber(
      record.rewriteCandidateMinImpressions,
      "rewriteCandidateMinImpressions",
    ),
    slackWebhookUrl: normalizeSlackWebhookUrl(record.slackWebhookUrl),
    schedulerTimeJst: normalizeTime(record.schedulerTimeJst),
    targetSiteHost,
    wordpressBaseUrl: normalizeWordPressBaseUrl(record.wordpressBaseUrl),
    wordpressAuthMode,
    wordpressUsername,
    wordpressApplicationPasswordSecretName,
    wordpressPostType: normalizeSlugLikeValue(
      record.wordpressPostType,
      "wordpressPostType",
      { required: true },
    ),
    wordpressPostStatuses: normalizeWordPressStatuses(
      record.wordpressPostStatuses,
    ),
  };
}

/**
 * Maps validated operational settings to persisted app-setting key/value rows.
 */
export function toAppSettingEntries(input: OperationalSettings) {
  const pairs: Record<AppSettingKey, string> = {
    alert_drop_threshold: String(input.alertDropThreshold),
    alert_rise_threshold: String(input.alertRiseThreshold),
    rewrite_candidate_min_impressions: String(
      input.rewriteCandidateMinImpressions,
    ),
    slack_webhook_url: input.slackWebhookUrl,
    scheduler_time_jst: input.schedulerTimeJst,
    target_site_host: input.targetSiteHost,
    wordpress_base_url: input.wordpressBaseUrl,
    wordpress_auth_mode: input.wordpressAuthMode,
    wordpress_username: input.wordpressUsername,
    wordpress_application_password_secret_name:
      input.wordpressApplicationPasswordSecretName,
    wordpress_post_type: input.wordpressPostType,
    wordpress_post_statuses: input.wordpressPostStatuses,
  };

  return pairs;
}
