import { randomBytes } from "node:crypto";

import { toJstDateString } from "@/lib/time/jst";

function normalizeJobName(jobName: string) {
  return jobName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function getJstTimeString(input: Date) {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  return formatter.format(input).replace(/:/g, "");
}

/**
 * Creates a traceable execution id using JST date, normalized job name, time,
 * and a short random suffix for uniqueness across retries.
 */
export function createExecutionId(jobName: string, now = new Date()) {
  const date = toJstDateString(now).replaceAll("-", "");
  const time = getJstTimeString(now);
  const normalizedJobName = normalizeJobName(jobName) || "job";
  const suffix = randomBytes(2).toString("hex");

  return `${date}-${normalizedJobName}-${time}-${suffix}`;
}

