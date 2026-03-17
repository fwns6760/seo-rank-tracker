import { NextResponse } from "next/server";

import { upsertTrackedKeyword } from "@/lib/bq";
import { getServerEnv } from "@/lib/env";
import { createJobLogger } from "@/lib/logging";
import {
  normalizeTrackedKeywordInput,
  SettingsValidationError,
} from "@/lib/validators/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const env = getServerEnv();
  const logger = createJobLogger({
    jobName: "upsert_tracked_keyword",
    targetSite: env.targetSiteHost,
  });

  logger.logExecution({
    status: "started",
    message: "Tracked keyword upsert started",
  });

  try {
    const body = (await request.json()) as unknown;
    const input = normalizeTrackedKeywordInput(body);
    const trackedKeyword = await upsertTrackedKeyword(input);

    logger.logExecution({
      status: "completed",
      message: "Tracked keyword upsert completed",
      inserted_rows: 1,
      extra: {
        output_summary: {
          keyword: trackedKeyword.keyword,
          target_url: trackedKeyword.target_url,
          pillar: trackedKeyword.pillar,
          cluster: trackedKeyword.cluster,
          intent: trackedKeyword.intent,
          is_active: trackedKeyword.is_active,
        },
      },
    });

    return NextResponse.json(
      {
        trackedKeyword,
        executionId: logger.executionId,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    const isValidationError = error instanceof SettingsValidationError;
    const message =
      error instanceof Error ? error.message : "Failed to save tracked keyword";

    logger.logError(error, {
      message: "Tracked keyword upsert failed",
      failedStep: isValidationError ? "validate_input" : "upsert_tracked_keyword",
      recoverable: false,
      error_count: 1,
    });

    return NextResponse.json(
      {
        error: message,
        executionId: logger.executionId,
      },
      {
        status: isValidationError ? 400 : 500,
      },
    );
  }
}
