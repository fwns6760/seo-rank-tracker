import { NextResponse } from "next/server";

import { getManualRun } from "@/lib/manual-runs/registry";
import { createJobLogger } from "@/lib/logging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    executionId: string;
  }>;
};

function getTargetSite() {
  return process.env.TARGET_SITE_HOST?.trim() || "unknown";
}

export async function GET(_: Request, context: RouteContext) {
  const logger = createJobLogger({
    jobName: "get_manual_run",
    targetSite: getTargetSite(),
  });

  logger.logExecution({
    status: "started",
    message: "Manual run lookup started",
  });

  try {
    const { executionId } = await context.params;
    const run = await getManualRun(executionId);

    if (!run) {
      logger.logExecution({
        status: "completed_with_warnings",
        severity: "WARNING",
        message: "Manual run lookup returned no result",
        error_count: 1,
        extra: {
          requested_execution_id: executionId,
        },
      });

      return NextResponse.json(
        {
          error: "Manual run not found",
          executionId: logger.executionId,
        },
        {
          status: 404,
        },
      );
    }

    logger.logExecution({
      status: "completed",
      message: "Manual run lookup completed",
      extra: {
        output_summary: {
          requested_execution_id: executionId,
          manual_run_status: run.status,
          manual_run_execution_id: run.executionId,
        },
      },
    });

    return NextResponse.json({
      run,
      executionId: logger.executionId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load manual run";

    logger.logError(error, {
      message: "Manual run lookup failed",
      failedStep: "get_manual_run",
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
