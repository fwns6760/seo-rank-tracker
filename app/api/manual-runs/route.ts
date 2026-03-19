import { NextResponse } from "next/server";

import {
  listManualRuns,
  ManualRunValidationError,
  startManualRun,
  validateManualRunRequest,
} from "@/lib/manual-runs/registry";
import { createJobLogger } from "@/lib/logging";
import type { ManualRunRequest } from "@/lib/manual-runs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTargetSite() {
  return process.env.TARGET_SITE_HOST?.trim() || "unknown";
}

export async function GET() {
  const logger = createJobLogger({
    jobName: "list_manual_runs",
    targetSite: getTargetSite(),
  });

  logger.logExecution({
    status: "started",
    message: "Manual run list request started",
  });

  try {
    const runs = await listManualRuns();

    logger.logExecution({
      status: "completed",
      message: "Manual run list request completed",
      fetched_rows: runs.length,
      extra: {
        output_summary: {
          run_count: runs.length,
        },
      },
    });

    return NextResponse.json({
      runs,
      executionId: logger.executionId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list manual runs";

    logger.logError(error, {
      message: "Manual run list request failed",
      failedStep: "list_manual_runs",
      recoverable: false,
      error_count: 1,
    });

    return NextResponse.json(
      {
        error: message,
        executionId: logger.executionId,
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  const logger = createJobLogger({
    jobName: "start_manual_run",
    targetSite: getTargetSite(),
  });

  logger.logExecution({
    status: "started",
    message: "Manual run start request started",
  });

  try {
    const body = (await request.json()) as ManualRunRequest;

    logger.logStep({
      step: "validate_input",
      stepStatus: "started",
      message: "Validating manual run payload",
    });
    validateManualRunRequest(body);
    logger.logStep({
      step: "validate_input",
      stepStatus: "success",
      message: "Manual run payload validated",
      inputSummary: {
        job_name: body.jobName,
        start_date: body.startDate,
        end_date: body.endDate,
        skip_bigquery_write: body.skipBigQueryWrite ?? false,
      },
    });

    logger.logStep({
      step: "start_manual_run",
      stepStatus: "started",
      message: "Starting manual run",
    });
    const run = await startManualRun(body);
    logger.logStep({
      step: "start_manual_run",
      stepStatus: "success",
      message: "Manual run started",
      outputSummary: {
        manual_run_execution_id: run.executionId,
        mode: run.mode,
        status: run.status,
      },
    });

    logger.logExecution({
      status: "completed",
      message: "Manual run start request completed",
      extra: {
        output_summary: {
          manual_run_execution_id: run.executionId,
          mode: run.mode,
          status: run.status,
        },
      },
    });

    return NextResponse.json(
      {
        run,
        executionId: logger.executionId,
      },
      {
        status: 202,
      },
    );
  } catch (error) {
    const isJsonError = error instanceof SyntaxError;
    const isValidationError =
      isJsonError || error instanceof ManualRunValidationError;
    const message = isJsonError
      ? "Request body must be valid JSON"
      : error instanceof Error
        ? error.message
        : "Failed to start manual run";

    logger.logError(error, {
      message: "Manual run start request failed",
      failedStep: isValidationError ? "validate_input" : "start_manual_run",
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
