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

function getTargetSite() {
  return process.env.TARGET_SITE_HOST?.trim() || "unknown";
}

export async function POST(request: Request) {
  const logger = createJobLogger({
    jobName: "register_internal_link_event",
    targetSite: getTargetSite(),
  });

  logger.logExecution({
    status: "started",
    message: "Internal link event registration started",
  });

  try {
    getServerEnv();
    const body = (await request.json()) as unknown;

    logger.logStep({
      step: "validate_input",
      stepStatus: "started",
      message: "Validating internal link event payload",
    });
    const input = normalizeInternalLinkEventInput(body);
    logger.logStep({
      step: "validate_input",
      stepStatus: "success",
      message: "Internal link event payload validated",
      inputSummary: {
        wp_post_id: input.wpPostId,
        url: input.url,
        change_date: input.changeDate,
      },
    });

    logger.logStep({
      step: "insert_internal_link_event",
      stepStatus: "started",
      message: "Inserting internal link event into BigQuery",
    });
    const event = await createInternalLinkEvent(input);
    logger.logStep({
      step: "insert_internal_link_event",
      stepStatus: "success",
      message: "Internal link event inserted into BigQuery",
      outputSummary: {
        id: event.id,
        wp_post_id: event.wp_post_id,
        url: event.url,
        change_date: event.change_date,
      },
    });

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
    const isJsonError = error instanceof SyntaxError;
    const isValidationError =
      isJsonError || error instanceof InternalLinkEventValidationError;
    const message = isJsonError
      ? "Request body must be valid JSON"
      : error instanceof Error
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
