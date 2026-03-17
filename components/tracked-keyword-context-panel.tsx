import Link from "next/link";

import type { TrackedKeywordRow } from "@/lib/bq";

function buildClusterHref(row: TrackedKeywordRow, days: number) {
  const params = new URLSearchParams();

  params.set("days", String(days));

  if (row.pillar) {
    params.set("pillar", row.pillar);
  }

  if (row.cluster) {
    params.set("cluster", row.cluster);
  }

  return `/clusters?${params.toString()}`;
}

function buildSettingsHref(row: TrackedKeywordRow) {
  const params = new URLSearchParams();

  params.set("keywordSearch", row.keyword);
  params.set("targetUrlSearch", row.target_url);

  if (row.pillar) {
    params.set("pillarSearch", row.pillar);
  }

  if (row.cluster) {
    params.set("clusterSearch", row.cluster);
  }

  return `/settings?${params.toString()}`;
}

type TrackedKeywordContextPanelProps = {
  title: string;
  rows: TrackedKeywordRow[];
  days: number;
  emptyMessage: string;
};

export function TrackedKeywordContextPanel({
  title,
  rows,
  days,
  emptyMessage,
}: TrackedKeywordContextPanelProps) {
  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          tracked keywords
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div
              key={`${row.keyword}:${row.target_url}`}
              className="rounded-2xl border border-border/70 bg-background/70 p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium leading-6">{row.keyword}</p>
                  <p className="break-all text-sm text-muted-foreground">{row.target_url}</p>
                  <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    <span>{row.category ?? "no-category"}</span>
                    <span>{row.pillar ?? "no-pillar"}</span>
                    <span>{row.cluster ?? "no-cluster"}</span>
                    <span>{row.intent ?? "no-intent"}</span>
                    <span>{row.priority ?? "no-priority"}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <Link className="font-medium text-primary hover:underline" href={buildClusterHref(row, days)}>
                    `/clusters`
                  </Link>
                  <Link className="font-medium text-primary hover:underline" href={`/pages?url=${encodeURIComponent(row.target_url)}&days=${days}`}>
                    `/pages`
                  </Link>
                  <Link className="font-medium text-primary hover:underline" href={`/keywords?keyword=${encodeURIComponent(row.keyword)}&url=${encodeURIComponent(row.target_url)}&days=${days}`}>
                    `/keywords`
                  </Link>
                  <Link className="font-medium text-primary hover:underline" href={buildSettingsHref(row)}>
                    `/settings`
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
