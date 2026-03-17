const requiredServerEnvKeys = [
  "GOOGLE_CLOUD_PROJECT",
  "BIGQUERY_DATASET",
  "BIGQUERY_LOCATION",
  "GSC_PROPERTY_URI",
  "TARGET_SITE_HOST",
] as const;

type RequiredServerEnvKey = (typeof requiredServerEnvKeys)[number];

export type ServerEnv = {
  googleCloudProject: string;
  bigQueryDataset: string;
  bigQueryLocation: string;
  gscPropertyUri: string;
  targetSiteHost: string;
  wordpressAuthMode?: string;
  wordpressBaseUrl?: string;
  wordpressPostType?: string;
  wordpressPostStatuses?: string;
  wordpressUsername?: string;
  wordpressApplicationPasswordSecretName?: string;
  googleApplicationCredentialsPath?: string;
  googleApplicationCredentialsJson?: string;
};

let cachedServerEnv: ServerEnv | null = null;

function readEnv(key: string) {
  return process.env[key]?.trim() ?? "";
}

function mapRequiredEnv(key: RequiredServerEnvKey) {
  return {
    key,
    value: readEnv(key),
  };
}

/**
 * Reads the validated server-side runtime configuration.
 */
export function getServerEnv(): ServerEnv {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  const requiredEntries = requiredServerEnvKeys.map(mapRequiredEnv);
  const missingKeys = requiredEntries
    .filter((entry) => entry.value.length === 0)
    .map((entry) => entry.key);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.join(", ")}`,
    );
  }

  cachedServerEnv = {
    googleCloudProject: readEnv("GOOGLE_CLOUD_PROJECT"),
    bigQueryDataset: readEnv("BIGQUERY_DATASET"),
    bigQueryLocation: readEnv("BIGQUERY_LOCATION"),
    gscPropertyUri: readEnv("GSC_PROPERTY_URI"),
    targetSiteHost: readEnv("TARGET_SITE_HOST"),
    wordpressAuthMode: readEnv("WORDPRESS_AUTH_MODE") || undefined,
    wordpressBaseUrl: readEnv("WORDPRESS_BASE_URL") || undefined,
    wordpressPostType: readEnv("WORDPRESS_POST_TYPE") || undefined,
    wordpressPostStatuses: readEnv("WORDPRESS_POST_STATUSES") || undefined,
    wordpressUsername: readEnv("WORDPRESS_USERNAME") || undefined,
    wordpressApplicationPasswordSecretName:
      readEnv("WORDPRESS_APPLICATION_PASSWORD_SECRET_NAME") || undefined,
    googleApplicationCredentialsPath:
      readEnv("GOOGLE_APPLICATION_CREDENTIALS") || undefined,
    googleApplicationCredentialsJson:
      readEnv("GOOGLE_APPLICATION_CREDENTIALS_JSON") || undefined,
  };

  return cachedServerEnv;
}

/**
 * Returns the required server env entries for diagnostics and setup pages.
 */
export function getRequiredServerEnv() {
  return requiredServerEnvKeys.map(mapRequiredEnv);
}
