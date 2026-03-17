import { getBigQueryClient } from "@/lib/bq/client";
import { loadQuerySql, type SqlQueryName } from "@/lib/bq/sql";
import type { QueryParams } from "@/lib/bq/types";
import { getServerEnv } from "@/lib/env";

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/**
 * Executes a named SQL template with named BigQuery parameters.
 */
export async function runNamedQuery<T>(
  name: SqlQueryName,
  params: QueryParams,
) {
  try {
    const env = getServerEnv();
    const query = await loadQuerySql(name);
    const client = getBigQueryClient();
    const [rows] = await client.query({
      query,
      params,
      location: env.bigQueryLocation,
    });

    return rows as T[];
  } catch (error) {
    throw new Error(
      `BigQuery query failed for "${name}": ${toErrorMessage(error)}`,
      {
        cause: error,
      },
    );
  }
}

