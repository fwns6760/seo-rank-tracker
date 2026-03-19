import { LoaderCircle } from "lucide-react";

function LoadingBlock({
  className,
}: {
  className: string;
}) {
  return <div className={`animate-pulse rounded-2xl bg-muted/70 ${className}`} />;
}

export function AppLoadingState() {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="space-y-6"
    >
      <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
          <span>Loading monitoring data...</span>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-[1.8fr_1fr_1fr]">
          <LoadingBlock className="h-11 w-full" />
          <LoadingBlock className="h-11 w-full" />
          <LoadingBlock className="h-11 w-full" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <LoadingBlock className="h-36 w-full" />
        <LoadingBlock className="h-36 w-full" />
        <LoadingBlock className="h-36 w-full" />
        <LoadingBlock className="h-36 w-full" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-sm">
          <LoadingBlock className="h-5 w-40" />
          <LoadingBlock className="mt-6 h-72 w-full" />
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <LoadingBlock className="h-20 w-full" />
            <LoadingBlock className="h-20 w-full" />
            <LoadingBlock className="h-20 w-full" />
          </div>
        </div>
        <div className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-sm">
          <LoadingBlock className="h-5 w-36" />
          <div className="mt-5 space-y-3">
            <LoadingBlock className="h-24 w-full" />
            <LoadingBlock className="h-24 w-full" />
            <LoadingBlock className="h-24 w-full" />
          </div>
        </div>
      </div>
    </section>
  );
}
