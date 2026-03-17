import { NextResponse } from "next/server";

import { createInternalLinkEvent } from "@/lib/bq";
import { getServerEnv } from "@/lib/env";
import { createJobLogger } from "@/lib/logging";
import {
  InternalLinkEventValidationError,
  normalizeInternalLinkEventInput,
} from "@/lib/validators/internal-link-events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const env = getServerEnv();
  const logger = createJobLogger({
    jobName: "register_internal_link_event",
    targetSite: env.targetSiteHost,
  });

  logger.logExecution({
    status: "started",
    message: "Internal link event registration started",
  });

  try {
    const body = (await request.json()) as unknown;
    const input = normalizeInternalLinkEventInput(body);
    const event = await createInternalLinkEvent(input);

    logger.logExecution({
      status: "completed",
      message: "Internal link event registration completed",
      inserted_rows: 1,
      extra: {
        output_summary: {
          id: event.id,
          wp_post_id: event.wp_post_id,
          url: event.url,
          change_date: event.change_date,
        },
      },
    });

    return NextResponse.json(
      {
        event,
        executionId: logger.executionId,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    const isValidationError = error instanceof InternalLinkEventValidationError;
    const message =
      error instanceof Error
        ? error.message
        : "Failed to register internal link event";

    logger.logError(error, {
      message: "Internal link event registration failed",
      failedStep: isValidationError ? "validate_input" : "insert_internal_link_event",
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
