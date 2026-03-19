import Link from "next/link";
import { AlertTriangle, ArrowRight, BarChart3, FilterX, Search } from "lucide-react";

import { AlertDispatchPanel } from "@/components/alert-dispatch-panel";
import { DashboardTrendChart } from "@/components/dashboard-trend-chart";
import { ManualRunPanel } from "@/components/manual-run-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import { getAlertFeed } from "@/lib/alerts/service";
import {
  getDashboardImportantPages,
  getDashboardTrend,
  getFilteredDashboardKpiSummary,
} from "@/lib/bq";
import type {
  AlertFeedRow,
  DashboardTrendRow,
  PageKpiRow,
} from "@/lib/bq";
import { getTrailingJstDateRange } from "@/lib/time/jst";
import { cn } from "@/lib/utils";

type SearchParamsValue = string | string[] | undefined;

type DashboardPageProps = {
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

function toTrendPoints(rows: DashboardTrendRow[]) {
  return rows.map((row) => ({
    date: row.date,
    averagePosition: coerceNumber(row.average_position),
    improvedKeywords: coerceNumber(row.improved_keywords) ?? 0,
    declinedKeywords: coerceNumber(row.declined_keywords) ?? 0,
  }));
}

function buildAlertTone(alert: AlertFeedRow) {
  if (alert.alert_type === "rank_drop" || alert.alert_type === "index_anomaly") {
    return "border-destructive/30 bg-destructive/5";
  }

  if (alert.alert_type === "rank_rise") {
    return "border-emerald-300/60 bg-emerald-50";
  }

  return "border-border/70 bg-card";
}

function buildAlertLabel(alert: AlertFeedRow) {
  if (alert.alert_type === "rank_drop") {
    return "Rank Drop";
  }

  if (alert.alert_type === "rank_rise") {
    return "Rank Rise";
  }

  return "Index Anomaly";
}

async function loadDashboardData(filters: { keyword?: string; url?: string }) {
  const trend7Range = getTrailingJstDateRange(7);
  const trend30Range = getTrailingJstDateRange(30);
  const trend90Range = getTrailingJstDateRange(90);

  const [summary, trend7, trend30, trend90, alerts, importantPages] =
    await Promise.all([
      getFilteredDashboardKpiSummary({
        ...trend30Range,
        ...filters,
      }),
      getDashboardTrend({
        ...trend7Range,
        ...filters,
      }),
      getDashboardTrend({
        ...trend30Range,
        ...filters,
      }),
      getDashboardTrend({
        ...trend90Range,
        ...filters,
      }),
      getAlertFeed({
        ...filters,
        limit: 8,
      }),
      getDashboardImportantPages({
        ...trend30Range,
        ...filters,
        limit: 6,
      }),
    ]);

  return {
    summary,
    trend7,
    trend30,
    trend90,
    alerts,
    importantPages,
  };
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

function AlertList({ alerts }: { alerts: AlertFeedRow[] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          <span>変動アラート一覧</span>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          アラート対象はまだありません。GSC データの蓄積後に直近差分を表示します。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <span>変動アラート一覧</span>
      </div>
      <div className="mt-4 space-y-3">
        {alerts.map((alert) => {
          const delta = coerceNumber(alert.position_delta);

          return (
            <div
              key={`${alert.url}:${alert.keyword}`}
              className={`rounded-2xl border p-4 ${buildAlertTone(alert)}`}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-background/80 px-2 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                      {buildAlertLabel(alert)}
                    </span>
                    {alert.priority ? (
                      <span className="rounded-full border border-border/70 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                        {alert.priority}
                      </span>
                    ) : null}
                  </div>
                  <p className="font-medium leading-6">{alert.keyword}</p>
                  <p className="break-all text-sm text-muted-foreground">{alert.url}</p>
                </div>
                <div className="text-sm">
                  {alert.alert_type === "index_anomaly" ? (
                    <>
                      <p>
                        Last seen:{" "}
                        <span className="font-semibold">{alert.latest_date ?? "--"}</span>
                      </p>
                      <p>
                        Missing days:{" "}
                        <span className="font-semibold">
                          {formatMetricNumber(alert.days_since_seen)}
                        </span>
                      </p>
                    </>
                  ) : (
                    <>
                      <p>
                        最新順位:{" "}
                        <span className="font-semibold">
                          {formatPosition(alert.latest_position)}
                        </span>
                      </p>
                      <p>
                        前回比:{" "}
                        <span className="font-semibold">
                          {delta === null
                            ? "--"
                            : `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-3">
                <p>Latest date: {alert.latest_date ?? "--"}</p>
                <p>Impressions: {formatMetricNumber(alert.latest_impressions)}</p>
                <p>
                  Baseline: {formatMetricNumber(alert.baseline_impressions)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImportantPagesList({ pages }: { pages: PageKpiRow[] }) {
  if (pages.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
        <p className="text-sm font-medium">重要ページ一覧</p>
        <p className="mt-4 text-sm text-muted-foreground">
          まだ表示できるページ KPI がありません。`daily_rankings` の投入後に反映されます。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <p className="text-sm font-medium">重要ページ一覧</p>
      <div className="mt-4 space-y-3">
        {pages.map((page) => (
          <div
            key={page.url}
            className="rounded-2xl border border-border/70 bg-background/70 p-4"
          >
            <p className="break-all text-sm font-medium leading-6">{page.url}</p>
            <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-4">
              <p>Clicks: {formatMetricNumber(page.clicks)}</p>
              <p>Impressions: {formatMetricNumber(page.impressions)}</p>
              <p>CTR: {formatPercent(page.ctr)}</p>
              <p>Avg Pos: {formatPosition(page.average_position)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const keyword = normalizeFilter(readSearchParam(resolvedSearchParams.keyword));
  const url = normalizeFilter(readSearchParam(resolvedSearchParams.url));
  const defaultDateRange = getTrailingJstDateRange(3);

  let dashboardData:
    | Awaited<ReturnType<typeof loadDashboardData>>
    | null = null;
  let dashboardError: string | null = null;

  try {
    dashboardData = await loadDashboardData({
      keyword,
      url,
    });
  } catch (error) {
    dashboardError =
      error instanceof Error
        ? error.message
        : "Failed to load dashboard data";
  }

  const trend7Points = toTrendPoints(dashboardData?.trend7 ?? []);
  const trend30Points = toTrendPoints(dashboardData?.trend30 ?? []);
  const trend90Points = toTrendPoints(dashboardData?.trend90 ?? []);
  const summary = dashboardData?.summary;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-[2rem] border border-border/70 bg-card/80 p-8 shadow-sm md:grid-cols-[1.3fr_0.9fr]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1 text-sm font-medium text-secondary-foreground">
            <BarChart3 className="h-4 w-4" />
            Phase 1 dashboard
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Search volatility, rewritten as an operational cockpit.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              KPI cards, trend windows, alert candidates, and priority pages are
              filtered directly from the URL so the dashboard stays shareable.
            </p>
          </div>
          <form className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 md:grid-cols-[1fr_1fr_auto]">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Keyword filter</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={keyword ?? ""}
                name="keyword"
                placeholder="例: 大谷翔平 ホームラン"
                type="text"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">URL filter</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={url ?? ""}
                name="url"
                placeholder="https://prosports.yoshilover.com/..."
                type="text"
              />
            </label>
            <div className="flex items-end gap-3">
              <Button className="gap-2" type="submit">
                <Search className="h-4 w-4" />
                Apply
              </Button>
              <Link
                className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
                href="/dashboard"
              >
                <FilterX className="h-4 w-4" />
                Clear
              </Link>
            </div>
          </form>
        </div>
        <div className="rounded-[1.5rem] border border-border/70 bg-background/80 p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Active scope
          </p>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Keyword
              </p>
              <p className="mt-2 text-lg font-semibold">{keyword ?? "All tracked keywords"}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                URL
              </p>
              <p className="mt-2 break-all text-lg font-semibold">{url ?? "All tracked URLs"}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Manual runs
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Need fresh data? Trigger `fetch_gsc` directly below and monitor the
                returned `execution_id`.
              </p>
            </div>
          </div>
        </div>
      </section>

      {dashboardError ? (
        <div className="rounded-[1.75rem] border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Dashboard data could not be loaded
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {dashboardError}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            BigQuery 環境変数または対象テーブルの準備後に再読み込みしてください。手動実行パネルは引き続き利用できます。
          </p>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="対象キーワード数"
          note="最新取得日のユニーク query 数"
          value={formatMetricNumber(summary?.tracked_keywords)}
        />
        <MetricCard
          label="平均順位"
          note="最新取得日の平均ポジション"
          value={formatPosition(summary?.average_position)}
        />
        <MetricCard
          label="前日比上昇数"
          note="直前営業日の比較で順位が改善した件数"
          value={formatMetricNumber(summary?.improved_keywords)}
        />
        <MetricCard
          label="前日比下落数"
          note="直前営業日の比較で順位が悪化した件数"
          value={formatMetricNumber(summary?.declined_keywords)}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-3">
        <DashboardTrendChart
          points={trend7Points}
          subtitle="直近 7 日の平均順位と前日差分"
          title="7日推移"
        />
        <DashboardTrendChart
          points={trend30Points}
          subtitle="直近 30 日の平均順位と前日差分"
          title="30日推移"
        />
        <DashboardTrendChart
          points={trend90Points}
          subtitle="直近 90 日の平均順位と前日差分"
          title="90日推移"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <AlertList alerts={dashboardData?.alerts.alerts ?? []} />
        <ImportantPagesList pages={dashboardData?.importantPages ?? []} />
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-card/80 p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
              Operations
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">
              手動実行と execution_id 追跡
            </h2>
          </div>
          <Link
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
            href="#manual-run-panel"
          >
            Open manual controls
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]" id="manual-run-panel">
        <ManualRunPanel
          initialEndDate={defaultDateRange.endDate}
          initialStartDate={defaultDateRange.startDate}
        />
        <AlertDispatchPanel />
      </div>
    </div>
  );
}
