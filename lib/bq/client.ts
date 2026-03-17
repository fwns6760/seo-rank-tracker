import { BigQuery, type BigQueryOptions } from "@google-cloud/bigquery";

import { getServerEnv } from "@/lib/env";

let cachedBigQueryClient: BigQuery | null = null;

function getCredentialsFromEnv(): BigQueryOptions["credentials"] | undefined {
  const env = getServerEnv();

  if (!env.googleApplicationCredentialsJson) {
    return undefined;
  }

  const credentials = JSON.parse(env.googleApplicationCredentialsJson) as Record<
    string,
    string
  >;

  if (typeof credentials.private_key === "string") {
    credentials.private_key = credentials.private_key.replace(/\\n/g, "\n");
  }

  return credentials;
}

/**
 * Builds a singleton BigQuery client for app routes and background jobs.
 */
export function getBigQueryClient() {
  if (cachedBigQueryClient) {
    return cachedBigQueryClient;
  }

  const env = getServerEnv();
  const credentials = getCredentialsFromEnv();

  cachedBigQueryClient = new BigQuery({
    projectId: env.googleCloudProject,
    keyFilename: env.googleApplicationCredentialsPath,
    credentials,
  });

  return cachedBigQueryClient;
}

