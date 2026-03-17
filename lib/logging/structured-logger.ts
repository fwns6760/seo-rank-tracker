import type { LogSeverity, StructuredLogEntry } from "@/lib/logging/types";

function sanitizeValue(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        sanitizeValue(nestedValue),
      ]),
    );
  }

  return value;
}

/**
 * Writes a structured JSON line for Cloud Logging ingestion.
 */
export function writeStructuredLog(entry: StructuredLogEntry) {
  const payload = JSON.stringify(sanitizeValue(entry));
  const stream =
    entry.severity === "ERROR" ? process.stderr : process.stdout;

  stream.write(`${payload}\n`);
}

/**
 * Applies the default severity mapping for explicit step and job states.
 */
export function getDefaultSeverity(
  status: string,
  fallback: LogSeverity = "INFO",
): LogSeverity {
  if (status === "failed" || status === "ERROR") {
    return "ERROR";
  }

  if (
    status === "warning" ||
    status === "completed_with_warnings" ||
    status === "retrying" ||
    status === "WARNING"
  ) {
    return "WARNING";
  }

  return fallback;
}

