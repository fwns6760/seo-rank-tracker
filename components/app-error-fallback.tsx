import Link from "next/link";
import { AlertTriangle, ArrowRight, RefreshCw, Settings2 } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type AppErrorFallbackProps = {
  title: string;
  description: string;
  errorDigest?: string;
  fullScreen?: boolean;
  onRetry?: (() => void) | undefined;
};

export function AppErrorFallback({
  title,
  description,
  errorDigest,
  fullScreen = false,
  onRetry,
}: AppErrorFallbackProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[2rem] border border-destructive/20 bg-card/90 p-8 shadow-sm",
        fullScreen &&
          "mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center border-0 bg-transparent p-6 shadow-none",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 opacity-70",
          "bg-[radial-gradient(circle_at_top_left,rgba(220,38,38,0.1),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(12,115,168,0.12),transparent_24%)]",
        )}
      />
      <div
        className={cn(
          "relative w-full rounded-[2rem] border border-destructive/15 bg-background/90 p-8 backdrop-blur",
          fullScreen && "mx-auto max-w-3xl",
        )}
      >
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-destructive/10 p-3 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
              Application Error
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">{title}</h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-border/70 bg-card/70 p-5 text-sm text-muted-foreground">
          <p>
            一時的な BigQuery 接続、環境変数設定、または server-side query の失敗が原因の可能性があります。
          </p>
          <p>
            再試行で解消しない場合は Cloud Logging と最新の `execution_id` を確認してください。
          </p>
          {errorDigest ? (
            <p>
              error digest: <span className="font-mono text-foreground">{errorDigest}</span>
            </p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {onRetry ? (
            <Button className="gap-2" type="button" onClick={() => onRetry()}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          ) : null}
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <ArrowRight className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/settings"
            className={cn(buttonVariants({ variant: "secondary" }), "gap-2")}
          >
            <Settings2 className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>
    </section>
  );
}
