export const rewriteTypePresets = [
  "title",
  "lead",
  "body_refresh",
  "structure_update",
  "internal_link",
  "full_refresh",
] as const;

export class RewriteValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RewriteValidationError";
  }
}

export type RewriteInput = {
  wpPostId: number | null;
  url: string;
  rewriteDate: string;
  rewriteType: string;
  summary: string | null;
  memo: string | null;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new RewriteValidationError("rewriteDate must use YYYY-MM-DD format");
  }

  const parsed = new Date(`${value}T00:00:00+09:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new RewriteValidationError("rewriteDate is invalid");
  }

  return value;
}

function validateUrl(value: string) {
  try {
    const parsed = new URL(value);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new RewriteValidationError("url must use http or https");
    }

    return parsed.toString();
  } catch (error) {
    if (error instanceof RewriteValidationError) {
      throw error;
    }

    throw new RewriteValidationError("url must be a valid absolute URL");
  }
}

function normalizeOptionalText(value: unknown, fieldName: string, maxLength: number) {
  const normalized = readString(value);

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new RewriteValidationError(
      `${fieldName} must be ${maxLength} characters or fewer`,
    );
  }

  return normalized;
}

function normalizeOptionalWpPostId(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new RewriteValidationError("wpPostId must be a positive integer");
  }

  return numeric;
}

/**
 * Validates and normalizes one rewrite registration payload.
 */
export function normalizeRewriteInput(payload: unknown): RewriteInput {
  if (!payload || typeof payload !== "object") {
    throw new RewriteValidationError("rewrite payload must be an object");
  }

  const record = payload as Record<string, unknown>;
  const url = validateUrl(readString(record.url));
  const rewriteDate = validateIsoDate(readString(record.rewriteDate));
  const rewriteType = readString(record.rewriteType);

  if (!rewriteType) {
    throw new RewriteValidationError("rewriteType is required");
  }

  if (rewriteType.length > 80) {
    throw new RewriteValidationError("rewriteType must be 80 characters or fewer");
  }

  return {
    wpPostId: normalizeOptionalWpPostId(record.wpPostId),
    url,
    rewriteDate,
    rewriteType,
    summary: normalizeOptionalText(record.summary, "summary", 280),
    memo: normalizeOptionalText(record.memo, "memo", 2000),
  };
}
