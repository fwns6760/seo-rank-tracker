import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FilterX,
  Search,
  Settings2,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { AppSettingsForm } from "@/components/app-settings-form";
import { TrackedKeywordForm } from "@/components/tracked-keyword-form";
import { TrackedKeywordStatusButton } from "@/components/tracked-keyword-status-button";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  getOperationalSettings,
  getTrackedKeywordCandidates,
  getTrackedKeywords,
} from "@/lib/bq";
import type { TrackedKeywordCandidateRow, TrackedKeywordRow } from "@/lib/bq";
import { getRuntimeDiagnostics } from "@/lib/env";
import { getSafeDefaultOperationalSettings } from "@/lib/settings/config";
import { formatJstDateTime, getTrailingJstDateRange } from "@/lib/time/jst";
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

function buildDraftHref(
  candidate: TrackedKeywordCandidateRow,
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

  params.set("draftKeyword", candidate.keyword);
  params.set("draftTargetUrl", candidate.target_url);

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

function LoadErrorNotice({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-destructive">
        <AlertTriangle className="h-4 w-4" />
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function SystemHealthPanel({
  runtimeDiagnostics,
}: {
  runtimeDiagnostics: ReturnType<typeof getRuntimeDiagnostics>;
}) {
  const hasMissingRequiredEnv = runtimeDiagnostics.missingRequiredKeys.length > 0;
  const hasManualRunGap = !runtimeDiagnostics.manualRunCloudRunReady;
  const isHealthy = !hasMissingRequiredEnv && !hasManualRunGap;

  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          {isHealthy ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          )}
          <span>system health</span>
        </div>
        <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <span
            className={cn(
              "rounded-full px-3 py-1",
              isHealthy
                ? "bg-emerald-100 text-emerald-700"
                : "bg-amber-100 text-amber-700",
            )}
          >
            {isHealthy ? "ready" : "check config"}
          </span>
          <Link className="font-medium text-primary hover:underline" href="/api/health">
            `/api/health`
          </Link>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            required env
          </p>
          <div className="mt-3 grid gap-2">
            {runtimeDiagnostics.requiredEnv.map((entry) => (
              <div
                key={entry.key}
                className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs text-muted-foreground">{entry.key}</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-[11px] font-medium uppercase tracking-[0.12em]",
                    entry.value.length > 0
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {entry.value.length > 0 ? "configured" : "missing"}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-2xl border border-border/70 bg-background/70 p-4 text-sm">
          <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              target site
            </p>
            <p className="mt-2 break-all font-semibold">
              {runtimeDiagnostics.targetSiteHost ?? "--"}
            </p>
          </div>
          <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              manual run mode
            </p>
            <p className="mt-2 font-semibold">{runtimeDiagnostics.manualRunMode}</p>
            {runtimeDiagnostics.manualRunMode === "cloud_run_job" ? (
              <div className="mt-2 space-y-1 text-muted-foreground">
                <p>region: {runtimeDiagnostics.manualRunCloudRunRegion || "--"}</p>
                <p>job: {runtimeDiagnostics.manualRunFetchGscJobName || "--"}</p>
              </div>
            ) : (
              <p className="mt-2 text-muted-foreground">
                local process mode uses the Web runtime directly.
              </p>
            )}
          </div>
          {!isHealthy ? (
            <div className="rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-amber-900">
              <p className="font-medium">Action needed</p>
              <div className="mt-2 space-y-1 text-sm">
                {hasMissingRequiredEnv ? (
                  <p>
                    missing env: {runtimeDiagnostics.missingRequiredKeys.join(", ")}
                  </p>
                ) : null}
                {hasManualRunGap ? (
                  <p>
                    `MANUAL_RUN_CLOUD_RUN_REGION` と `MANUAL_RUN_FETCH_GSC_JOB_NAME`
                    を設定してください。
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function formatAggregateNumber(value: number | string | null) {
  if (value === null) {
    return "--";
  }

  const numeric = typeof value === "number" ? value : Number(value);

  if (Number.isFinite(numeric)) {
    return numeric.toLocaleString("ja-JP");
  }

  return String(value);
}

function formatAveragePosition(value: number | null) {
  return value === null ? "--" : value.toFixed(2);
}

function TrackedKeywordCandidateList({
  rows,
  loadError,
  filters,
}: {
  rows: TrackedKeywordCandidateRow[];
  loadError?: string | null;
  filters: {
    keywordSearch?: string;
    targetUrlSearch?: string;
    pillarSearch?: string;
    clusterSearch?: string;
    status?: string;
  };
}) {
  const hasTaxonomyFilter = Boolean(filters.pillarSearch || filters.clusterSearch);

  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>GSC 追加候補</span>
        </div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          recent 90 days
        </p>
      </div>

      <div className="mt-4 space-y-3">
        {loadError ? (
          <LoadErrorNotice
            title="候補データを読み込めませんでした"
            message={loadError}
          />
        ) : rows.length > 0 ? (
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
                    <p>impressions: {formatAggregateNumber(row.impressions)}</p>
                    <p>clicks: {formatAggregateNumber(row.clicks)}</p>
                    <p>avg position: {formatAveragePosition(row.average_position)}</p>
                    <p>latest seen: {row.latest_date ?? "--"}</p>
                    <p>recommended priority: high</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-3">
                  <Link
                    className={cn(buttonVariants({ variant: "default", size: "sm" }))}
                    href={buildDraftHref(row, filters)}
                  >
                    Prefill high priority
                  </Link>
                  <Link
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    href={`/keywords?keyword=${encodeURIComponent(row.keyword)}&url=${encodeURIComponent(row.target_url)}&days=90`}
                  >
                    `/keywords`
                  </Link>
                  <Link
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    href={`/pages?url=${encodeURIComponent(row.target_url)}&days=90`}
                  >
                    `/pages`
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            未登録候補はありません。`daily_rankings` の recent data が増えるか、現在の keyword / URL filter を広げると候補が出ます。
          </p>
        )}
      </div>

      <p className="mt-4 text-sm text-muted-foreground">
        直近 90 日の `daily_rankings` から、まだ `tracked_keywords` に存在しない keyword / URL
        ペアだけを抽出しています。初期投入は `impressions` が高い順に `priority=high`
        で登録する前提です。
        {hasTaxonomyFilter
          ? " 未登録 row には taxonomy が無いため、この候補欄は keyword / URL filter を優先して表示します。"
          : ""}
      </p>
    </section>
  );
}

function TrackedKeywordList({
  rows,
  loadError,
  currentFiltersHref,
  filters,
}: {
  rows: TrackedKeywordRow[];
  loadError?: string | null;
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
        {loadError ? (
          <LoadErrorNotice
            title="tracked keyword 一覧を読み込めませんでした"
            message={loadError}
          />
        ) : rows.length > 0 ? (
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
  const draftKeyword = normalizeFilter(
    readSearchParam(resolvedSearchParams.draftKeyword),
  );
  const draftTargetUrl = normalizeFilter(
    readSearchParam(resolvedSearchParams.draftTargetUrl),
  );
  const candidateRange = getTrailingJstDateRange(90);
  const fallbackSettings = getSafeDefaultOperationalSettings();
  const runtimeDiagnostics = getRuntimeDiagnostics();

  let trackedKeywords: TrackedKeywordRow[] = [];
  let trackedKeywordCandidates: TrackedKeywordCandidateRow[] = [];
  let appSettings:
    | Awaited<ReturnType<typeof getOperationalSettings>>
    | null = null;
  let trackedKeywordsError: string | null = null;
  let trackedKeywordCandidatesError: string | null = null;
  let appSettingsError: string | null = null;

  const [trackedKeywordsResult, trackedKeywordCandidatesResult, appSettingsResult] =
    await Promise.allSettled([
      getTrackedKeywords({
        keywordSearch,
        targetUrlSearch,
        pillarSearch,
        clusterSearch,
        statusFilter,
        limit: 50,
      }),
      getTrackedKeywordCandidates({
        ...candidateRange,
        keywordSearch,
        targetUrlSearch,
        limit: 12,
      }),
      getOperationalSettings(),
    ]);

  if (trackedKeywordsResult.status === "fulfilled") {
    trackedKeywords = trackedKeywordsResult.value;
  } else {
    trackedKeywordsError =
      trackedKeywordsResult.reason instanceof Error
        ? trackedKeywordsResult.reason.message
        : "Failed to load tracked keywords";
  }

  if (trackedKeywordCandidatesResult.status === "fulfilled") {
    trackedKeywordCandidates = trackedKeywordCandidatesResult.value;
  } else {
    trackedKeywordCandidatesError =
      trackedKeywordCandidatesResult.reason instanceof Error
        ? trackedKeywordCandidatesResult.reason.message
        : "Failed to load tracked keyword candidates";
  }

  if (appSettingsResult.status === "fulfilled") {
    appSettings = appSettingsResult.value;
  } else {
    appSettingsError =
      appSettingsResult.reason instanceof Error
        ? appSettingsResult.reason.message
        : "Failed to load app settings";
  }

  const currentFiltersHref = buildCurrentFiltersHref({
    keywordSearch,
    targetUrlSearch,
    pillarSearch,
    clusterSearch,
    status,
  });
  const effectiveSettings = appSettings?.values ?? fallbackSettings;
  const selectedTrackedKeyword =
    trackedKeywords.find(
      (row) => row.keyword === editKeyword && row.target_url === editTargetUrl,
    ) ?? null;
  const draftTrackedKeyword =
    !selectedTrackedKeyword && draftKeyword && draftTargetUrl
      ? {
          keyword: draftKeyword,
          target_url: draftTargetUrl,
          priority: "high",
        }
      : null;
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
  const hasAnyLoadError = Boolean(
    trackedKeywordsError || trackedKeywordCandidatesError || appSettingsError,
  );

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
                placeholder="大谷翔平 ホームラン"
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
                placeholder="MLB 分析"
                type="text"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Cluster filter</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={clusterSearch ?? ""}
                name="clusterSearch"
                placeholder="ドジャース戦レビュー"
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
                {selectedTrackedKeyword?.keyword ??
                  draftTrackedKeyword?.keyword ??
                  "new tracked keyword"}
              </p>
              {selectedTrackedKeyword ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  {selectedTrackedKeyword.pillar ?? "--"} /{" "}
                  {selectedTrackedKeyword.cluster ?? "--"}
                </p>
              ) : draftTrackedKeyword ? (
                <p className="mt-2 break-all text-sm text-muted-foreground">
                  candidate: {draftTrackedKeyword.target_url}
                </p>
              ) : null}
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Scheduler time
              </p>
              <p className="mt-2 text-lg font-semibold">
                {effectiveSettings.schedulerTimeJst || "--"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                WordPress base URL
              </p>
              <p className="mt-2 break-all text-lg font-semibold">
                {effectiveSettings.wordpressBaseUrl || "--"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {hasAnyLoadError ? (
        <div className="rounded-[1.75rem] border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Settings data loaded with gaps
          </div>
          <div className="mt-2 space-y-1 text-sm text-muted-foreground">
            {trackedKeywordsError ? <p>tracked keywords: {trackedKeywordsError}</p> : null}
            {trackedKeywordCandidatesError ? (
              <p>candidate list: {trackedKeywordCandidatesError}</p>
            ) : null}
            {appSettingsError ? <p>app settings: {appSettingsError}</p> : null}
            {appSettingsError ? (
              <p>app settings form には env fallback を表示しています。</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <SystemHealthPanel runtimeDiagnostics={runtimeDiagnostics} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="tracked keywords"
          note="現在の filter 条件に一致する行数"
          value={
            trackedKeywordsError ? "--" : formatCount(trackedKeywords.length)
          }
        />
        <MetricCard
          label="active"
          note="is_active=true の keyword 数"
          value={trackedKeywordsError ? "--" : formatCount(activeCount)}
        />
        <MetricCard
          label="taxonomy"
          note="category / pillar / cluster の distinct 数"
          value={
            trackedKeywordsError
              ? "-- / -- / --"
              : `${formatCount(categoriesCount)} / ${formatCount(pillarsCount)} / ${formatCount(clustersCount)}`
          }
        />
        <MetricCard
          label="alert drop"
          note="position drop alert threshold"
          value={String(effectiveSettings.alertDropThreshold)}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <TrackedKeywordForm
          key={
            selectedTrackedKeyword
              ? `edit:${selectedTrackedKeyword.keyword}:${selectedTrackedKeyword.target_url}`
              : draftTrackedKeyword
                ? `draft:${draftTrackedKeyword.keyword}:${draftTrackedKeyword.target_url}`
                : "new"
          }
          currentFiltersHref={currentFiltersHref}
          draftTrackedKeyword={draftTrackedKeyword}
          initialTrackedKeyword={selectedTrackedKeyword}
        />
        <AppSettingsForm
          initialSettings={effectiveSettings}
        />
      </section>

      <TrackedKeywordCandidateList
        filters={{
          keywordSearch,
          targetUrlSearch,
          pillarSearch,
          clusterSearch,
          status,
        }}
        loadError={trackedKeywordCandidatesError}
        rows={trackedKeywordCandidates}
      />

      <TrackedKeywordList
        currentFiltersHref={currentFiltersHref}
        filters={{ keywordSearch, targetUrlSearch, pillarSearch, clusterSearch, status }}
        loadError={trackedKeywordsError}
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
