import Link from "next/link";
import { AlertTriangle, FilterX, Link2, Search, Sparkles } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { getClusterOverview } from "@/lib/bq";
import type { ClusterOverviewRow } from "@/lib/bq";
import { getTrailingJstDateRange } from "@/lib/time/jst";
import { trackedKeywordIntents } from "@/lib/validators/settings";
import { cn } from "@/lib/utils";

type SearchParamsValue = string | string[] | undefined;

type ClustersPageProps = {
  searchParams?: Promise<Record<string, SearchParamsValue>>;
};

export const dynamic = "force-dynamic";

function readSearchParam(value: SearchParamsValue) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeFilter(value: string) {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : undefined;
}

function clampDays(value: string) {
  const numeric = Number(value);

  if (numeric === 30 || numeric === 90 || numeric === 180) {
    return numeric;
  }

  return 90;
}

function normalizeIntentFilter(value: string) {
  return trackedKeywordIntents.includes(
    value as (typeof trackedKeywordIntents)[number],
  )
    ? value
    : undefined;
}

function coerceNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

function formatMetricNumber(value: number | string | null | undefined, digits = 0) {
  const numeric = coerceNumber(value);

  if (numeric === null) {
    return "--";
  }

  return numeric.toLocaleString("ja-JP", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatPosition(value: number | string | null | undefined) {
  return formatMetricNumber(value, 2);
}

function formatPercent(value: number | null | undefined) {
  const numeric = coerceNumber(value);

  if (numeric === null) {
    return "--";
  }

  return `${(numeric * 100).toLocaleString("ja-JP", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

function formatDate(value: string | null | undefined) {
  return value ?? "--";
}

function formatIntents(value: string[] | null | undefined) {
  if (!value || value.length === 0) {
    return "--";
  }

  return value.join(" / ");
}

function buildClusterTone(row: ClusterOverviewRow) {
  const issuePages = coerceNumber(row.issue_pages) ?? 0;
  const averagePosition = coerceNumber(row.average_position);

  if (issuePages >= 3) {
    return "border-destructive/30 bg-destructive/5";
  }

  if (issuePages > 0 || (averagePosition !== null && averagePosition >= 10)) {
    return "border-amber-300/60 bg-amber-50/70";
  }

  return "border-border/70 bg-card/80";
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

function ClusterCard({ row, days }: { row: ClusterOverviewRow; days: number }) {
  const pagesParams = new URLSearchParams();
  const keywordsParams = new URLSearchParams();
  const rewritesParams = new URLSearchParams();
  const linksParams = new URLSearchParams();

  pagesParams.set("days", String(days));
  keywordsParams.set("days", String(days));
  rewritesParams.set("days", String(days));
  linksParams.set("days", String(days));

  if (row.pillar) {
    pagesParams.set("pillar", row.pillar);
    keywordsParams.set("pillar", row.pillar);
    rewritesParams.set("pillar", row.pillar);
    linksParams.set("pillar", row.pillar);
  }

  if (row.cluster) {
    pagesParams.set("cluster", row.cluster);
    keywordsParams.set("cluster", row.cluster);
    rewritesParams.set("cluster", row.cluster);
    linksParams.set("cluster", row.cluster);
  }

  if (row.primary_url) {
    pagesParams.set("url", row.primary_url);
    rewritesParams.set("url", row.primary_url);
    linksParams.set("urlSearch", row.primary_url);
  }

  if (row.primary_keyword) {
    keywordsParams.set("keyword", row.primary_keyword);
  }

  if (row.primary_keyword_url) {
    keywordsParams.set("url", row.primary_keyword_url);
  } else if (row.primary_url) {
    keywordsParams.set("url", row.primary_url);
  }

  const pagesHref = `/pages?${pagesParams.toString()}`;
  const keywordsHref = `/keywords?${keywordsParams.toString()}`;
  const rewritesHref = `/rewrites?${rewritesParams.toString()}`;
  const linksHref = `/links?${linksParams.toString()}`;

  return (
    <article className={`rounded-[1.75rem] border p-5 shadow-sm ${buildClusterTone(row)}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-background/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {row.pillar ?? "unassigned pillar"}
            </span>
            <span className="rounded-full border border-border/70 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {formatIntents(row.intents)}
            </span>
          </div>
          <div>
            <h2 className="text-xl font-semibold tracking-tight">{row.cluster}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              主表示 URL: {row.primary_url ?? "--"}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              主キーワード: {row.primary_keyword ?? "--"}
            </p>
          </div>
        </div>
        <div className="grid gap-3 text-sm md:grid-cols-3 xl:min-w-[360px] xl:grid-cols-1">
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Link issues
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatMetricNumber(row.issue_pages)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              orphan {formatMetricNumber(row.orphan_pages)} / broken{" "}
              {formatMetricNumber(row.broken_pages)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Rewrites
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatMetricNumber(row.rewrite_count)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              range 内に記録された施策件数
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5 grid gap-3 text-sm md:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            URLs
          </p>
          <p className="mt-2 text-lg font-semibold">{formatMetricNumber(row.target_pages)}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Keywords
          </p>
          <p className="mt-2 text-lg font-semibold">
            {formatMetricNumber(row.tracked_keywords)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Impressions
          </p>
          <p className="mt-2 text-lg font-semibold">
            {formatMetricNumber(row.total_impressions)}
          </p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Clicks
          </p>
          <p className="mt-2 text-lg font-semibold">{formatMetricNumber(row.total_clicks)}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            CTR
          </p>
          <p className="mt-2 text-lg font-semibold">{formatPercent(row.ctr)}</p>
        </div>
        <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Avg position
          </p>
          <p className="mt-2 text-lg font-semibold">
            {formatPosition(row.average_position)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
        <p>latest ranking: {formatDate(row.latest_date)}</p>
        <p>latest crawl: {formatDate(row.latest_crawl_date)}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={pagesHref}>
          `/pages`
        </Link>
        <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={keywordsHref}>
          `/keywords`
        </Link>
        <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={rewritesHref}>
          `/rewrites`
        </Link>
        <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href={linksHref}>
          `/links`
        </Link>
      </div>
    </article>
  );
}

export default async function ClustersPage({ searchParams }: ClustersPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const pillarSearch = normalizeFilter(readSearchParam(resolvedSearchParams.pillar));
  const clusterSearch = normalizeFilter(readSearchParam(resolvedSearchParams.cluster));
  const intent = normalizeIntentFilter(readSearchParam(resolvedSearchParams.intent));
  const days = clampDays(readSearchParam(resolvedSearchParams.days));
  const range = getTrailingJstDateRange(days);

  let rows: ClusterOverviewRow[] = [];
  let pageError: string | null = null;

  try {
    rows = await getClusterOverview({
      ...range,
      pillarSearch,
      clusterSearch,
      intentFilter: intent,
      limit: 40,
    });
  } catch (error) {
    pageError = error instanceof Error ? error.message : "Failed to load cluster overview";
  }

  const totalTrackedKeywords = rows.reduce(
    (sum, row) => sum + (coerceNumber(row.tracked_keywords) ?? 0),
    0,
  );
  const totalTargetPages = rows.reduce(
    (sum, row) => sum + (coerceNumber(row.target_pages) ?? 0),
    0,
  );
  const totalImpressions = rows.reduce(
    (sum, row) => sum + (coerceNumber(row.total_impressions) ?? 0),
    0,
  );
  const totalIssuePages = rows.reduce(
    (sum, row) => sum + (coerceNumber(row.issue_pages) ?? 0),
    0,
  );
  const totalRewrites = rows.reduce(
    (sum, row) => sum + (coerceNumber(row.rewrite_count) ?? 0),
    0,
  );
  const focusCluster =
    [...rows].sort((left, right) => {
      const leftIssues = coerceNumber(left.issue_pages) ?? 0;
      const rightIssues = coerceNumber(right.issue_pages) ?? 0;

      if (leftIssues !== rightIssues) {
        return rightIssues - leftIssues;
      }

      const leftImpressions = coerceNumber(left.total_impressions) ?? 0;
      const rightImpressions = coerceNumber(right.total_impressions) ?? 0;

      return rightImpressions - leftImpressions;
    })[0] ?? null;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-[2rem] border border-border/70 bg-card/80 p-8 shadow-sm md:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1 text-sm font-medium text-secondary-foreground">
            <Sparkles className="h-4 w-4" />
            Cluster portfolio
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Track topic clusters, not just individual URLs.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              active な tracked keywords のうち cluster が付いたものを集約し、
              traffic、rewrite、内部リンク課題を cluster 単位で並べます。
            </p>
          </div>
          <form className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_220px_140px_auto]">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Pillar filter</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={pillarSearch ?? ""}
                name="pillar"
                placeholder="MLB 分析"
                type="text"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Cluster filter</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={clusterSearch ?? ""}
                name="cluster"
                placeholder="ドジャース戦レビュー"
                type="text"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Intent</span>
              <select
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={intent ?? "all"}
                name="intent"
              >
                <option value="all">all</option>
                {trackedKeywordIntents.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Window</span>
              <select
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={String(days)}
                name="days"
              >
                <option value="30">30d</option>
                <option value="90">90d</option>
                <option value="180">180d</option>
              </select>
            </label>
            <div className="flex items-end gap-3">
              <Button className="gap-2" type="submit">
                <Search className="h-4 w-4" />
                Apply
              </Button>
              <Link className={cn(buttonVariants({ variant: "outline" }), "gap-2")} href="/clusters">
                <FilterX className="h-4 w-4" />
                Clear
              </Link>
            </div>
          </form>
        </div>
        <div className="rounded-[1.5rem] border border-border/70 bg-background/80 p-6">
          <p className="text-sm font-medium text-muted-foreground">Current focus</p>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Analysis window
              </p>
              <p className="mt-2 text-lg font-semibold">
                {range.startDate} - {range.endDate}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Focus cluster
              </p>
              <p className="mt-2 text-lg font-semibold">
                {focusCluster?.cluster ?? "no cluster data"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {focusCluster
                  ? `${formatMetricNumber(focusCluster.issue_pages)} issue pages / ${formatMetricNumber(focusCluster.total_impressions)} impressions`
                  : "cluster と GSC データ投入後に優先テーマを表示します。"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Drilldown
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href="/settings">
                  taxonomy source
                </Link>
                <Link className={cn(buttonVariants({ variant: "outline", size: "sm" }))} href="/dashboard">
                  dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {pageError ? (
        <div className="rounded-[1.75rem] border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Cluster data could not be loaded
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{pageError}</p>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="clusters"
          note="現在の filter 条件に一致する cluster 数"
          value={formatMetricNumber(rows.length)}
        />
        <MetricCard
          label="tracked keywords"
          note="cluster 配下の active keyword 数"
          value={formatMetricNumber(totalTrackedKeywords)}
        />
        <MetricCard
          label="target pages"
          note="cluster 配下の代表 URL 数"
          value={formatMetricNumber(totalTargetPages)}
        />
        <MetricCard
          label="impressions"
          note={`${days} 日窓での合計表示回数`}
          value={formatMetricNumber(totalImpressions)}
        />
        <MetricCard
          label="rewrite / issues"
          note="rewrite 件数と内部リンク課題ページ数"
          value={`${formatMetricNumber(totalRewrites)} / ${formatMetricNumber(totalIssuePages)}`}
        />
      </section>

      <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Link2 className="h-4 w-4 text-primary" />
          <span>Cluster overview</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          `cluster` が設定された active tracked keyword だけを集計対象にしています。
          rewrite は article-level、内部リンク課題は最新 crawl 上の orphan / 404 接触 URL を数えます。
        </p>
        <div className="mt-5 space-y-4">
          {rows.length > 0 ? (
            rows.map((row) => <ClusterCard key={`${row.pillar ?? "--"}:${row.cluster}`} days={days} row={row} />)
          ) : (
            <p className="text-sm text-muted-foreground">
              条件に合う cluster はありません。`/settings` で `pillar / cluster / intent`
              を付けた tracked keyword を登録するとここに表示されます。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
