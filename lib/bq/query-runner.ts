import { getBigQueryClient } from "@/lib/bq/client";
import { loadQuerySql, type SqlQueryName } from "@/lib/bq/sql";
import type { QueryParams } from "@/lib/bq/types";
import { getServerEnv } from "@/lib/env";

type BigQueryParamTypes = Record<string, string | string[]>;

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?$/;

const NULL_PARAM_TYPE_OVERRIDES: Record<string, string | string[]> = {
  wp_post_id: "INT64",
};

function toErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function inferScalarType(value: unknown, key?: string): string {
  if (value === null) {
    if (key && key in NULL_PARAM_TYPE_OVERRIDES) {
      const override = NULL_PARAM_TYPE_OVERRIDES[key];

      if (typeof override === "string") {
        return override;
      }
    }

    return "STRING";
  }

  if (value instanceof Date) {
    return "TIMESTAMP";
  }

  if (typeof value === "string") {
    if (DATE_ONLY_PATTERN.test(value)) {
      return "DATE";
    }

    if (TIMESTAMP_PATTERN.test(value)) {
      return "TIMESTAMP";
    }

    return "STRING";
  }

  if (typeof value === "number") {
    return Number.isInteger(value) ? "INT64" : "FLOAT64";
  }

  if (typeof value === "boolean") {
    return "BOOL";
  }

  return "STRING";
}

function buildQueryParamTypes(params: QueryParams): BigQueryParamTypes | undefined {
  const entries = Object.entries(params);

  if (entries.length === 0) {
    return undefined;
  }

  const types = entries.reduce<Record<string, string | string[]>>((acc, [key, value]) => {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        acc[key] = ["STRING"];
        return acc;
      }

      const hasNullishItem = value.some((item) => item === null || item === undefined);

      if (!hasNullishItem) {
        return acc;
      }

      const firstDefined = value.find((item) => item !== null && item !== undefined);
      const elementType = inferScalarType(firstDefined ?? null, key);
      acc[key] = [elementType];
      return acc;
    }

    if (value === null) {
      acc[key] = inferScalarType(value, key);
    }

    return acc;
  }, {});

  return Object.keys(types).length > 0 ? types : undefined;
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
    const types = buildQueryParamTypes(params);
    const [rows] = await client.query({
      query,
      params,
      types,
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
