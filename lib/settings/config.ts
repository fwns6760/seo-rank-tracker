import { getServerEnv } from "@/lib/env";

export const appSettingKeys = [
  "alert_drop_threshold",
  "alert_rise_threshold",
  "rewrite_candidate_min_impressions",
  "slack_webhook_url",
  "scheduler_time_jst",
  "target_site_host",
  "wordpress_base_url",
  "wordpress_auth_mode",
  "wordpress_username",
  "wordpress_application_password_secret_name",
  "wordpress_post_type",
  "wordpress_post_statuses",
] as const;

export type AppSettingKey = (typeof appSettingKeys)[number];
export const wordpressAuthModes = ["none", "basic"] as const;
export type WordPressAuthMode = (typeof wordpressAuthModes)[number];

export type OperationalSettings = {
  alertDropThreshold: number;
  alertRiseThreshold: number;
  rewriteCandidateMinImpressions: number;
  slackWebhookUrl: string;
  schedulerTimeJst: string;
  targetSiteHost: string;
  wordpressBaseUrl: string;
  wordpressAuthMode: WordPressAuthMode;
  wordpressUsername: string;
  wordpressApplicationPasswordSecretName: string;
  wordpressPostType: string;
  wordpressPostStatuses: string;
};

/**
 * Returns default operational settings before persisted overrides are applied.
 */
export function getDefaultOperationalSettings(): OperationalSettings {
  const env = getServerEnv();

  return {
    alertDropThreshold: 3,
    alertRiseThreshold: 3,
    rewriteCandidateMinImpressions: 500,
    slackWebhookUrl: "",
    schedulerTimeJst: "06:00",
    targetSiteHost: env.targetSiteHost,
    wordpressBaseUrl: env.wordpressBaseUrl ?? `https://${env.targetSiteHost}`,
    wordpressAuthMode:
      env.wordpressAuthMode === "basic" || env.wordpressAuthMode === "none"
        ? env.wordpressAuthMode
        : env.wordpressUsername && env.wordpressApplicationPasswordSecretName
          ? "basic"
          : "none",
    wordpressUsername: env.wordpressUsername ?? "",
    wordpressApplicationPasswordSecretName:
      env.wordpressApplicationPasswordSecretName ?? "",
    wordpressPostType: env.wordpressPostType ?? "posts",
    wordpressPostStatuses: env.wordpressPostStatuses ?? "publish",
  };
}
