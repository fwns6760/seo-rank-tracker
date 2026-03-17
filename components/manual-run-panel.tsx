"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Play,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { ManualRunRecord } from "@/lib/manual-runs/types";

type ManualRunPanelProps = {
  initialStartDate: string;
  initialEndDate: string;
};

type RunResponse = {
  run: ManualRunRecord;
};

function getStatusIcon(status: ManualRunRecord["status"]) {
  if (status === "completed") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
  }

  if (status === "failed") {
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  }

  return <CircleDashed className="h-4 w-4 animate-spin text-primary" />;
}

export function ManualRunPanel({
  initialStartDate,
  initialEndDate,
}: ManualRunPanelProps) {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [skipBigQueryWrite, setSkipBigQueryWrite] = useState(false);
  const [run, setRun] = useState<ManualRunRecord | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function refreshRun(executionId: string) {
    const response = await fetch(`/api/manual-runs/${executionId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Failed to refresh manual run status");
    }

    const payload = (await response.json()) as RunResponse;
    setRun(payload.run);
  }

  useEffect(() => {
    if (!run || (run.status !== "queued" && run.status !== "running")) {
      return;
    }

    const poll = () => {
      void refreshRun(run.executionId).catch((error) => {
        setApiError(
          error instanceof Error
            ? error.message
            : "Failed to poll manual run status",
        );
      });
    };

    const intervalId = window.setInterval(() => {
      poll();
    }, 1500);

    return () => window.clearInterval(intervalId);
  }, [run]);

  function handleSubmit() {
    setApiError(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/manual-runs", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jobName: "fetch_gsc",
              startDate,
              endDate,
              skipBigQueryWrite,
            }),
          });

          const payload = (await response.json()) as
            | RunResponse
            | { error: string };

          if (!response.ok || !("run" in payload)) {
            throw new Error(
              "error" in payload ? payload.error : "Failed to start manual run",
            );
          }

          setRun(payload.run);
        } catch (error) {
          setApiError(
            error instanceof Error ? error.message : "Failed to start manual run",
          );
        }
      })();
    });
  }

  return (
    <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Manual Run
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            Trigger the GSC fetch job from the dashboard
          </h2>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Start an on-demand `fetch_gsc` run and track either the local process
            or the Cloud Run execution state from the dashboard.
          </p>
        </div>
        <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/80 p-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Start date</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-0"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">End date</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none ring-0"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>
          <label className="col-span-full flex items-center gap-3 rounded-xl border border-border/70 bg-card px-4 py-3 text-sm">
            <input
              checked={skipBigQueryWrite}
              className="h-4 w-4 rounded border-border"
              type="checkbox"
              onChange={(event) => setSkipBigQueryWrite(event.target.checked)}
            />
            <span>
              Skip BigQuery write
              <span className="ml-2 text-muted-foreground">
                Useful while validating the fetch path only.
              </span>
            </span>
          </label>
          <div className="col-span-full flex flex-wrap gap-3">
            <Button
              className="gap-2"
              disabled={isPending || run?.status === "running"}
              type="button"
              onClick={() => void handleSubmit()}
            >
              <Play className="h-4 w-4" />
              {run?.status === "running" ? "Running..." : "Run fetch_gsc"}
            </Button>
            <Button
              className="gap-2"
              disabled={!run}
              type="button"
              variant="outline"
              onClick={() => {
                if (!run) {
                  return;
                }

                void refreshRun(run.executionId).catch((error) => {
                  setApiError(
                    error instanceof Error
                      ? error.message
                      : "Failed to refresh manual run status",
                  );
                });
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh status
            </Button>
          </div>
        </div>
      </div>

      {apiError ? (
        <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Manual run failed to start
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{apiError}</p>
        </div>
      ) : null}

      {run ? (
        <div className="mt-6 grid gap-4 rounded-2xl border border-border/70 bg-background/70 p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                {getStatusIcon(run.status)}
                <span>{run.statusMessage}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {run.mode === "cloud_run_job" ? "Cloud Run execution" : "execution_id"}:{" "}
                <span className="font-mono">{run.executionId}</span>
              </p>
              {run.cloudRunExecutionName ? (
                <p className="text-xs text-muted-foreground">
                  resource: <span className="font-mono">{run.cloudRunExecutionName}</span>
                </p>
              ) : null}
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Started: {new Date(run.startedAt).toLocaleString("ja-JP")}</p>
              <p>
                Finished:{" "}
                {run.finishedAt
                  ? new Date(run.finishedAt).toLocaleString("ja-JP")
                  : "--"}
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Arguments
              </p>
              <pre className="mt-3 overflow-x-auto text-xs leading-6 text-muted-foreground">
                {JSON.stringify(run.input, null, 2)}
              </pre>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Command
              </p>
              <pre className="mt-3 overflow-x-auto text-xs leading-6 text-muted-foreground">
                {run.args.join(" ")}
              </pre>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Stdout
              </p>
              <pre className="mt-3 max-h-64 overflow-auto text-xs leading-6 text-muted-foreground">
                {run.stdout.length > 0
                  ? run.stdout.join("\n")
                  : run.mode === "cloud_run_job"
                    ? "Cloud Run mode does not stream stdout here. Check Cloud Logging with the execution resource name."
                    : "No stdout yet."}
              </pre>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Stderr
              </p>
              <pre className="mt-3 max-h-64 overflow-auto text-xs leading-6 text-muted-foreground">
                {run.stderr.length > 0
                  ? run.stderr.join("\n")
                  : run.mode === "cloud_run_job"
                    ? "Cloud Run mode does not stream stderr here. Use Cloud Logging for structured logs."
                    : "No stderr yet."}
              </pre>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
