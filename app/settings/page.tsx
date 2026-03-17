import Link from "next/link";
import { AlertTriangle, FilterX, Search, Settings2, SlidersHorizontal } from "lucide-react";

import { AppSettingsForm } from "@/components/app-settings-form";
import { TrackedKeywordForm } from "@/components/tracked-keyword-form";
import { TrackedKeywordStatusButton } from "@/components/tracked-keyword-status-button";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  getOperationalSettings,
  getTrackedKeywords,
} from "@/lib/bq";
import type { TrackedKeywordRow } from "@/lib/bq";
import { getDefaultOperationalSettings } from "@/lib/settings/config";
import { formatJstDateTime } from "@/lib/time/jst";
import { cn } from "@/lib/utils";

type SearchParamsValue = string | string[] | undefined;

type SettingsPageProps = {
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

function parseStatusFilter(value: string) {
  if (value === "active") {
    return true;
  }

  if (value === "inactive") {
    return false;
  }

  return null;
}

function formatCount(value: number) {
  return value.toLocaleString("ja-JP");
}

function buildCurrentFiltersHref(filters: {
  keywordSearch?: string;
  targetUrlSearch?: string;
  pillarSearch?: string;
  clusterSearch?: string;
  status?: string;
}) {
  const params = new URLSearchParams();

  if (filters.keywordSearch) {
    params.set("keywordSearch", filters.keywordSearch);
  }

  if (filters.targetUrlSearch) {
    params.set("targetUrlSearch", filters.targetUrlSearch);
  }

  if (filters.pillarSearch) {
    params.set("pillarSearch", filters.pillarSearch);
  }

  if (filters.clusterSearch) {
    params.set("clusterSearch", filters.clusterSearch);
  }

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  const query = params.toString();

  return query ? `/settings?${query}` : "/settings";
}

function buildEditHref(
  trackedKeyword: TrackedKeywordRow,
  filters: {
    keywordSearch?: string;
    targetUrlSearch?: string;
    pillarSearch?: string;
    clusterSearch?: string;
    status?: string;
  },
) {
  const params = new URLSearchParams();

  if (filters.keywordSearch) {
    params.set("keywordSearch", filters.keywordSearch);
  }

  if (filters.targetUrlSearch) {
    params.set("targetUrlSearch", filters.targetUrlSearch);
  }

  if (filters.pillarSearch) {
    params.set("pillarSearch", filters.pillarSearch);
  }

  if (filters.clusterSearch) {
    params.set("clusterSearch", filters.clusterSearch);
  }

  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  params.set("editKeyword", trackedKeyword.keyword);
  params.set("editTargetUrl", trackedKeyword.target_url);

  return `/settings?${params.toString()}`;
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
      <p className="mt-3 text-3xl font-semibold tracking-tight break-all">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

function TrackedKeywordList({
  rows,
  currentFiltersHref,
  filters,
}: {
  rows: TrackedKeywordRow[];
  currentFiltersHref: string;
  filters: {
    keywordSearch?: string;
    targetUrlSearch?: string;
    pillarSearch?: string;
    clusterSearch?: string;
    status?: string;
  };
}) {
  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span>tracked_keywords 一覧</span>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          latest updated first
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div
              key={`${row.keyword}:${row.target_url}`}
              className="rounded-2xl border border-border/70 bg-background/70 p-4"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium">{row.keyword}</p>
                  <p className="break-all text-sm text-muted-foreground">
                    {row.target_url}
                  </p>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <p>category: {row.category ?? "--"}</p>
                    <p>pillar: {row.pillar ?? "--"}</p>
                    <p>cluster: {row.cluster ?? "--"}</p>
                    <p>intent: {row.intent ?? "--"}</p>
                    <p>priority: {row.priority ?? "--"}</p>
                    <p>status: {row.is_active ? "active" : "inactive"}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                    <p>updated: {formatJstDateTime(row.updated_at)}</p>
                    <Link
                      className="font-medium text-primary hover:underline"
                      href={`/keywords?keyword=${encodeURIComponent(row.keyword)}&url=${encodeURIComponent(row.target_url)}&days=90`}
                    >
                      `/keywords`
                    </Link>
                    <Link
                      className="font-medium text-primary hover:underline"
                      href={`/pages?url=${encodeURIComponent(row.target_url)}&days=90`}
                    >
                      `/pages`
                    </Link>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  <Link
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    href={buildEditHref(row, filters)}
                  >
                    Edit
                  </Link>
                  <TrackedKeywordStatusButton
                    currentFiltersHref={currentFiltersHref}
                    trackedKeyword={row}
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            条件に合う tracked keyword はありません。
          </p>
        )}
      </div>
    </section>
  );
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const keywordSearch = normalizeFilter(
    readSearchParam(resolvedSearchParams.keywordSearch),
  );
  const targetUrlSearch = normalizeFilter(
    readSearchParam(resolvedSearchParams.targetUrlSearch),
  );
  const pillarSearch = normalizeFilter(
    readSearchParam(resolvedSearchParams.pillarSearch),
  );
  const clusterSearch = normalizeFilter(
    readSearchParam(resolvedSearchParams.clusterSearch),
  );
  const status = normalizeFilter(readSearchParam(resolvedSearchParams.status)) ?? "all";
  const statusFilter = parseStatusFilter(status);
  const editKeyword = normalizeFilter(readSearchParam(resolvedSearchParams.editKeyword));
  const editTargetUrl = normalizeFilter(
    readSearchParam(resolvedSearchParams.editTargetUrl),
  );

  let trackedKeywords: TrackedKeywordRow[] = [];
  let appSettings:
    | Awaited<ReturnType<typeof getOperationalSettings>>
    | null = null;
  let pageError: string | null = null;

  try {
    [trackedKeywords, appSettings] = await Promise.all([
      getTrackedKeywords({
        keywordSearch,
        targetUrlSearch,
        pillarSearch,
        clusterSearch,
        statusFilter,
        limit: 50,
      }),
      getOperationalSettings(),
    ]);
  } catch (error) {
    pageError =
      error instanceof Error ? error.message : "Failed to load settings data";
  }

  const currentFiltersHref = buildCurrentFiltersHref({
    keywordSearch,
    targetUrlSearch,
    pillarSearch,
    clusterSearch,
    status,
  });
  const fallbackSettings = getDefaultOperationalSettings();
  const selectedTrackedKeyword =
    trackedKeywords.find(
      (row) => row.keyword === editKeyword && row.target_url === editTargetUrl,
    ) ?? null;
  const activeCount = trackedKeywords.filter((row) => row.is_active).length;
  const categoriesCount = new Set(
    trackedKeywords.map((row) => row.category).filter(Boolean),
  ).size;
  const pillarsCount = new Set(
    trackedKeywords.map((row) => row.pillar).filter(Boolean),
  ).size;
  const clustersCount = new Set(
    trackedKeywords.map((row) => row.cluster).filter(Boolean),
  ).size;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-[2rem] border border-border/70 bg-card/80 p-8 shadow-sm md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1 text-sm font-medium text-secondary-foreground">
            <Settings2 className="h-4 w-4" />
            Settings control plane
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Manage tracked keywords and the rules around them.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              tracked_keywords と app_settings をこの画面で管理し、将来の Job と
              alert の基準値と cluster 分析の基礎データを固定します。
            </p>
          </div>
          <form className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_180px_auto]">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Keyword filter</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={keywordSearch ?? ""}
                name="keywordSearch"
                placeholder="family travel"
                type="text"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Target URL filter</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={targetUrlSearch ?? ""}
                name="targetUrlSearch"
                placeholder="https://prosports.yoshilover.com/..."
                type="text"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Pillar filter</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={pillarSearch ?? ""}
                name="pillarSearch"
                placeholder="travel planning"
                type="text"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Cluster filter</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={clusterSearch ?? ""}
                name="clusterSearch"
                placeholder="packing checklist"
                type="text"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Status</span>
              <select
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={status}
                name="status"
              >
                <option value="all">all</option>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
            <div className="flex items-end gap-3">
              <Button className="gap-2" type="submit">
                <Search className="h-4 w-4" />
                Apply
              </Button>
              <Link
                className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
                href="/settings"
              >
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
                Editing
              </p>
              <p className="mt-2 text-lg font-semibold">
                {selectedTrackedKeyword?.keyword ?? "new tracked keyword"}
              </p>
              {selectedTrackedKeyword ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedTrackedKeyword.pillar ?? "--"} /{" "}
                  {selectedTrackedKeyword.cluster ?? "--"}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Scheduler time
              </p>
              <p className="mt-2 text-lg font-semibold">
                {appSettings?.values.schedulerTimeJst ?? "--"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                WordPress base URL
              </p>
              <p className="mt-2 break-all text-lg font-semibold">
                {appSettings?.values.wordpressBaseUrl ?? "--"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {pageError ? (
        <div className="rounded-[1.75rem] border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Settings data could not be loaded
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{pageError}</p>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="tracked keywords"
          note="現在の filter 条件に一致する行数"
          value={formatCount(trackedKeywords.length)}
        />
        <MetricCard
          label="active"
          note="is_active=true の keyword 数"
          value={formatCount(activeCount)}
        />
        <MetricCard
          label="taxonomy"
          note="category / pillar / cluster の distinct 数"
          value={`${formatCount(categoriesCount)} / ${formatCount(pillarsCount)} / ${formatCount(clustersCount)}`}
        />
        <MetricCard
          label="alert drop"
          note="position drop alert threshold"
          value={String(appSettings?.values.alertDropThreshold ?? "--")}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <TrackedKeywordForm
          currentFiltersHref={currentFiltersHref}
          initialTrackedKeyword={selectedTrackedKeyword}
        />
        <AppSettingsForm
          initialSettings={appSettings?.values ?? fallbackSettings}
        />
      </section>

      <TrackedKeywordList
        currentFiltersHref={currentFiltersHref}
        filters={{ keywordSearch, targetUrlSearch, pillarSearch, clusterSearch, status }}
        rows={trackedKeywords}
      />

      <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
        <p className="text-sm font-medium">補助メモ</p>
        <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <p>tracked_keywords は今後の Job / alert と cluster 分析の基準データとして使う前提です。</p>
          <p>`category` は既存の運用ラベルとして残し、`pillar / cluster / intent` は SEO 用のトピック構造として別管理します。</p>
          <p>WordPress 接続先と同期範囲は app_settings に保存し、認証が必要な場合は Secret Manager の参照名だけを保持します。</p>
          <p>Slack Webhook は空でも保存可能で、通知機能実装時に有効化します。</p>
        </div>
      </section>
    </div>
  );
}
