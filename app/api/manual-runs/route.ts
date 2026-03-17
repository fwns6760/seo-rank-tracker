import { NextResponse } from "next/server";

import {
  listManualRuns,
  startManualRun,
} from "@/lib/manual-runs/registry";
import type { ManualRunRequest } from "@/lib/manual-runs/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    runs: await listManualRuns(),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ManualRunRequest;
    const run = await startManualRun(body);

    return NextResponse.json(
      {
        run,
      },
      {
        status: 202,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to start manual run";

    return NextResponse.json(
      {
        error: message,
      },
      {
        status: 400,
      },
    );
  }
}
