const JST_TIME_ZONE = "Asia/Tokyo";

function getJstDateParts(value: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(value);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";

  return {
    year,
    month,
    day,
  };
}

/**
 * Formats a Date-like input as `YYYY-MM-DD` in JST.
 */
export function toJstDateString(input: Date | number | string = new Date()) {
  const date = new Date(input);
  const { year, month, day } = getJstDateParts(date);

  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date-like input as a localized JST timestamp label.
 */
export function formatJstDateTime(
  input: Date | number | string,
  locale = "ja-JP",
) {
  const formatter = new Intl.DateTimeFormat(locale, {
    timeZone: JST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return formatter.format(new Date(input));
}

/**
 * Returns a trailing inclusive JST date window, suitable for partition filters.
 */
export function getTrailingJstDateRange(
  dayCount: number,
  anchor: Date = new Date(),
) {
  const safeDayCount = Math.max(1, Math.trunc(dayCount));
  const endDate = toJstDateString(anchor);
  const start = new Date(`${endDate}T00:00:00+09:00`);

  start.setUTCDate(start.getUTCDate() - (safeDayCount - 1));

  return {
    startDate: toJstDateString(start),
    endDate,
  };
}

/**
 * Shifts a JST `YYYY-MM-DD` date string by the provided number of days.
 */
export function shiftJstDateString(dateString: string, offsetDays: number) {
  const baseDate = new Date(`${dateString}T00:00:00+09:00`);

  baseDate.setUTCDate(baseDate.getUTCDate() + Math.trunc(offsetDays));

  return toJstDateString(baseDate);
}
