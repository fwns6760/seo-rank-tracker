import { NextResponse } from "next/server";

import { getManualRun } from "@/lib/manual-runs/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{
    executionId: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { executionId } = await context.params;
  const run = await getManualRun(executionId);

  if (!run) {
    return NextResponse.json(
      {
        error: "Manual run not found",
      },
      {
        status: 404,
      },
    );
  }

  return NextResponse.json({
    run,
  });
}
