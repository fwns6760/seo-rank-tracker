export class InternalLinkEventValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InternalLinkEventValidationError";
  }
}

export type InternalLinkEventInput = {
  wpPostId: number | null;
  url: string;
  changeDate: string;
  summary: string | null;
  memo: string | null;
};

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function validateIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new InternalLinkEventValidationError("changeDate must use YYYY-MM-DD format");
  }

  const parsed = new Date(`${value}T00:00:00+09:00`);

  if (Number.isNaN(parsed.getTime())) {
    throw new InternalLinkEventValidationError("changeDate is invalid");
  }

  return value;
}

function validateUrl(value: string) {
  try {
    const parsed = new URL(value);

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new InternalLinkEventValidationError("url must use http or https");
    }

    return parsed.toString();
  } catch (error) {
    if (error instanceof InternalLinkEventValidationError) {
      throw error;
    }

    throw new InternalLinkEventValidationError("url must be a valid absolute URL");
  }
}

function normalizeOptionalText(value: unknown, fieldName: string, maxLength: number) {
  const normalized = readString(value);

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw new InternalLinkEventValidationError(
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
    throw new InternalLinkEventValidationError("wpPostId must be a positive integer");
  }

  return numeric;
}

/**
 * Validates and normalizes one internal-link event payload.
 */
export function normalizeInternalLinkEventInput(
  payload: unknown,
): InternalLinkEventInput {
  if (!payload || typeof payload !== "object") {
    throw new InternalLinkEventValidationError(
      "internal link event payload must be an object",
    );
  }

  const record = payload as Record<string, unknown>;

  return {
    wpPostId: normalizeOptionalWpPostId(record.wpPostId),
    url: validateUrl(readString(record.url)),
    changeDate: validateIsoDate(readString(record.changeDate)),
    summary: normalizeOptionalText(record.summary, "summary", 280),
    memo: normalizeOptionalText(record.memo, "memo", 2000),
  };
}
