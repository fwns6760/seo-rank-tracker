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

function getTargetSite() {
  return process.env.TARGET_SITE_HOST?.trim() || "unknown";
}

export async function POST(request: Request) {
  const logger = createJobLogger({
    jobName: "upsert_tracked_keyword",
    targetSite: getTargetSite(),
  });

  logger.logExecution({
    status: "started",
    message: "Tracked keyword upsert started",
  });

  try {
    getServerEnv();
    const body = (await request.json()) as unknown;

    logger.logStep({
      step: "validate_input",
      stepStatus: "started",
      message: "Validating tracked keyword payload",
    });
    const input = normalizeTrackedKeywordInput(body);
    logger.logStep({
      step: "validate_input",
      stepStatus: "success",
      message: "Tracked keyword payload validated",
      inputSummary: {
        keyword: input.keyword,
        target_url: input.targetUrl,
        pillar: input.pillar,
        cluster: input.cluster,
        intent: input.intent,
        is_active: input.isActive,
      },
    });

    logger.logStep({
      step: "upsert_tracked_keyword",
      stepStatus: "started",
      message: "Upserting tracked keyword into BigQuery",
    });
    const trackedKeyword = await upsertTrackedKeyword(input);
    logger.logStep({
      step: "upsert_tracked_keyword",
      stepStatus: "success",
      message: "Tracked keyword upserted into BigQuery",
      outputSummary: {
        keyword: trackedKeyword.keyword,
        target_url: trackedKeyword.target_url,
        pillar: trackedKeyword.pillar,
        cluster: trackedKeyword.cluster,
        intent: trackedKeyword.intent,
        is_active: trackedKeyword.is_active,
      },
    });

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
    const isJsonError = error instanceof SyntaxError;
    const isValidationError =
      isJsonError || error instanceof SettingsValidationError;
    const message = isJsonError
      ? "Request body must be valid JSON"
      : error instanceof Error
        ? error.message
        : "Failed to save tracked keyword";

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
