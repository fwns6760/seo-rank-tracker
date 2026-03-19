import { NextResponse } from "next/server";

import { createRewriteRecord } from "@/lib/bq";
import { getServerEnv } from "@/lib/env";
import { createJobLogger } from "@/lib/logging";
import {
  normalizeRewriteInput,
  RewriteValidationError,
} from "@/lib/validators/rewrites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTargetSite() {
  return process.env.TARGET_SITE_HOST?.trim() || "unknown";
}

export async function POST(request: Request) {
  const logger = createJobLogger({
    jobName: "register_rewrite",
    targetSite: getTargetSite(),
  });

  logger.logExecution({
    status: "started",
    message: "Rewrite registration started",
  });

  try {
    getServerEnv();
    const body = (await request.json()) as unknown;

    logger.logStep({
      step: "validate_input",
      stepStatus: "started",
      message: "Validating rewrite registration payload",
    });

    const input = normalizeRewriteInput(body);

    logger.logStep({
      step: "validate_input",
      stepStatus: "success",
      message: "Rewrite registration payload validated",
      inputSummary: {
        wp_post_id: input.wpPostId,
        url: input.url,
        rewrite_date: input.rewriteDate,
        rewrite_type: input.rewriteType,
      },
    });

    logger.logStep({
      step: "insert_rewrite",
      stepStatus: "started",
      message: "Inserting rewrite record into BigQuery",
    });

    const rewrite = await createRewriteRecord(input);

    logger.logStep({
      step: "insert_rewrite",
      stepStatus: "success",
      message: "Rewrite record inserted into BigQuery",
      outputSummary: {
        id: rewrite.id,
        wp_post_id: rewrite.wp_post_id,
        url: rewrite.url,
        rewrite_date: rewrite.rewrite_date,
      },
    });

    logger.logExecution({
      status: "completed",
      message: "Rewrite registration completed",
      inserted_rows: 1,
    });

    return NextResponse.json(
      {
        rewrite,
        executionId: logger.executionId,
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    const isJsonError = error instanceof SyntaxError;
    const isValidationError =
      isJsonError || error instanceof RewriteValidationError;
    const message = isJsonError
      ? "Request body must be valid JSON"
      : error instanceof Error
        ? error.message
        : "Failed to register rewrite";

    logger.logError(error, {
      message: "Rewrite registration failed",
      failedStep: isValidationError ? "validate_input" : "insert_rewrite",
      recoverable: false,
      error_count: 1,
      extra: {
        request_kind: "api",
      },
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
