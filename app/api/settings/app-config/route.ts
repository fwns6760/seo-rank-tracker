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

export async function POST(request: Request) {
  const env = getServerEnv();
  const logger = createJobLogger({
    jobName: "upsert_app_settings",
    targetSite: env.targetSiteHost,
  });

  logger.logExecution({
    status: "started",
    message: "Operational settings update started",
  });

  try {
    const body = (await request.json()) as unknown;
    const input = normalizeOperationalSettingsInput(body);
    const entries = toAppSettingEntries(input);
    await upsertOperationalSettings(entries);

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
    const isValidationError = error instanceof SettingsValidationError;
    const message =
      error instanceof Error ? error.message : "Failed to save app settings";

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
