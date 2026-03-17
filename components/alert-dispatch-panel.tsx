"use client";

import { BellRing, CheckCircle2, LoaderCircle, TriangleAlert } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DispatchResponse = {
  executionId?: string;
  sent?: boolean;
  skippedReason?: string;
  alertCount?: number;
  counts?: {
    rankDrop: number;
    rankRise: number;
    indexAnomaly: number;
  };
  error?: string;
};

function buildStatusMessage(result: DispatchResponse | null) {
  if (!result) {
    return null;
  }

  if (result.error) {
    return result.error;
  }

  if (result.sent) {
    return `Slack へ ${result.alertCount ?? 0} 件の alert を送信しました。`;
  }

  if (result.skippedReason === "slack_webhook_not_configured") {
    return "Slack Webhook が未設定のため通知をスキップしました。";
  }

  if (result.skippedReason === "no_alert_candidates") {
    return "現在のしきい値に一致する alert はありません。";
  }

  return "通知状態を確認してください。";
}

export function AlertDispatchPanel() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<DispatchResponse | null>(null);
  const [hasError, setHasError] = useState(false);

  return (
    <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Notifications
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">
            Slack alert dispatch
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            `/settings` に保存したしきい値と Slack Webhook を使って、現在の
            alert 一覧を通知します。
          </p>
        </div>
        <BellRing className="h-5 w-5 text-primary" />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          disabled={isPending}
          onClick={() => {
            setHasError(false);
            startTransition(async () => {
              try {
                const response = await fetch("/api/alerts/dispatch", {
                  method: "POST",
                });
                const payload = (await response.json()) as DispatchResponse;

                if (!response.ok) {
                  throw new Error(payload.error ?? "Failed to dispatch alerts");
                }

                setResult(payload);
                setHasError(false);
              } catch (error) {
                setResult({
                  error:
                    error instanceof Error
                      ? error.message
                      : "Failed to dispatch alerts",
                });
                setHasError(true);
              }
            });
          }}
          type="button"
        >
          {isPending ? (
            <>
              <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            "Send alerts"
          )}
        </Button>
        {result?.executionId ? (
          <p className="text-xs text-muted-foreground">
            execution_id: <span className="font-mono">{result.executionId}</span>
          </p>
        ) : null}
      </div>

      {buildStatusMessage(result) ? (
        <div
          className={cn(
            "mt-4 rounded-2xl border px-4 py-3 text-sm",
            hasError
              ? "border-destructive/30 bg-destructive/5 text-destructive"
              : "border-border/70 bg-background/70 text-muted-foreground",
          )}
        >
          <div className="flex items-center gap-2">
            {hasError ? (
              <TriangleAlert className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            )}
            <span>{buildStatusMessage(result)}</span>
          </div>
          {result?.counts ? (
            <p className="mt-2 text-xs">
              drop={result.counts.rankDrop} / rise={result.counts.rankRise} /
              index={result.counts.indexAnomaly}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
