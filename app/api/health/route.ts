import { NextResponse } from "next/server";

import { getRequiredServerEnv } from "@/lib/env";
import { createJobLogger } from "@/lib/logging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const logger = createJobLogger({
    jobName: "health_check",
    targetSite: process.env.TARGET_SITE_HOST?.trim() || "unknown",
  });
  const requiredEnv = getRequiredServerEnv();
  const missing = requiredEnv
    .filter((entry) => entry.value.length === 0)
    .map((entry) => entry.key);
  const status = missing.length === 0 ? "ok" : "degraded";
  const responseStatus = missing.length === 0 ? 200 : 503;

  logger.logExecution({
    status: missing.length === 0 ? "completed" : "completed_with_warnings",
    severity: missing.length === 0 ? "INFO" : "WARNING",
    message:
      missing.length === 0
        ? "Health check completed"
        : "Health check completed with missing required environment variables",
    error_count: missing.length === 0 ? 0 : 1,
    extra: {
      output_summary: {
        status,
        missing,
      },
    },
  });

  return NextResponse.json(
    {
      status,
      checkedAt: new Date().toISOString(),
      executionId: logger.executionId,
      targetSiteHost: process.env.TARGET_SITE_HOST?.trim() || null,
      manualRunMode: process.env.MANUAL_RUN_MODE?.trim() || "local_process",
      requiredEnv: requiredEnv.map((entry) => ({
        key: entry.key,
        configured: entry.value.length > 0,
      })),
      missing,
    },
    {
      status: responseStatus,
    },
  );
}
