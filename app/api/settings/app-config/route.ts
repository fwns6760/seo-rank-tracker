import { NextResponse } from "next/server";

import { upsertOperationalSettings } from "@/lib/bq";
import { getServerEnv } from "@/lib/env";
import { createJobLogger } from "@/lib/logging";
import { toAppSettingEntries } from "@/lib/validators/settings";
import {
  normalizeOperationalSettingsInput,
  SettingsValidationError,
} from "@/lib/validators/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTargetSite() {
  return process.env.TARGET_SITE_HOST?.trim() || "unknown";
}

export async function POST(request: Request) {
  const logger = createJobLogger({
    jobName: "upsert_app_settings",
    targetSite: getTargetSite(),
  });

  logger.logExecution({
    status: "started",
    message: "Operational settings update started",
  });

  try {
    getServerEnv();
    const body = (await request.json()) as unknown;

    logger.logStep({
      step: "validate_input",
      stepStatus: "started",
      message: "Validating operational settings payload",
    });
    const input = normalizeOperationalSettingsInput(body);
    logger.logStep({
      step: "validate_input",
      stepStatus: "success",
      message: "Operational settings payload validated",
      inputSummary: {
        updated_keys: Object.keys(input),
      },
    });
    const entries = toAppSettingEntries(input);

    logger.logStep({
      step: "upsert_app_settings",
      stepStatus: "started",
      message: "Upserting operational settings into BigQuery",
      inputSummary: {
        updated_keys: Object.keys(entries),
      },
    });
    await upsertOperationalSettings(entries);
    logger.logStep({
      step: "upsert_app_settings",
      stepStatus: "success",
      message: "Operational settings upserted into BigQuery",
      outputSummary: {
        updated_keys: Object.keys(entries),
      },
    });

    logger.logExecution({
      status: "completed",
      message: "Operational settings update completed",
      inserted_rows: Object.keys(entries).length,
      extra: {
        output_summary: {
          updated_keys: Object.keys(entries),
        },
      },
    });

    return NextResponse.json(
      {
        settings: input,
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
        : "Failed to save app settings";

    logger.logError(error, {
      message: "Operational settings update failed",
      failedStep: isValidationError ? "validate_input" : "upsert_app_settings",
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
