import Link from "next/link";
import {
  AlertTriangle,
  ArrowRightLeft,
  FilterX,
  Search,
  Sparkles,
} from "lucide-react";

import { RewriteImpactList } from "@/components/rewrite-impact-list";
import { RewriteRegistrationForm } from "@/components/rewrite-registration-form";
import { TrackedKeywordContextPanel } from "@/components/tracked-keyword-context-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  getPageCandidates,
  getRewriteBeforeAfterComparison,
  getRewriteHistory,
  getRewriteOpportunityCandidates,
  getTrackedKeywords,
  getWordPressPostByUrl,
  getWordPressPosts,
} from "@/lib/bq";
import type {
  PageCandidateRow,
  RewriteOpportunityRow,
  RewriteRecordRow,
  WordPressPostRow,
} from "@/lib/bq";
import { toJstDateString, getTrailingJstDateRange } from "@/lib/time/jst";
import { cn } from "@/lib/utils";

type SearchParamsValue = string | string[] | undefined;

type RewritesPageProps = {
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

function clampImpactWindow(value: string) {
  const numeric = Number(value);

  if (numeric === 14) {
    return 14;
  }

  return 7;
}

function appendClusterFilters(
  params: URLSearchParams,
  filters: {
    pillarSearch?: string;
    clusterSearch?: string;
  },
) {
  if (filters.pillarSearch) {
    params.set("pillar", filters.pillarSearch);
  }

  if (filters.clusterSearch) {
    params.set("cluster", filters.clusterSearch);
  }
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
  const numeric = coerceNumber(value);

  if (numeric === null) {
    return "未取得";
  }

  return numeric.toLocaleString("ja-JP", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number | null | undefined) {
  const numeric = coerceNumber(value);

  if (numeric === null) {
    return "未取得";
  }

  return `${(numeric * 100).toLocaleString("ja-JP", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}

async function loadOptional<T>(promise: Promise<T>) {
  try {
    return {
      data: await promise,
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error ? error.message : "Optional section could not be loaded",
    };
  }
}

async function loadRewritesPageData({
  url,
  urlSearch,
  days,
  impactWindow,
  pillarSearch,
  clusterSearch,
}: {
  url?: string;
  urlSearch?: string;
  days: number;
  impactWindow: number;
  pillarSearch?: string;
  clusterSearch?: string;
}) {
  const range = getTrailingJstDateRange(days);
  const candidateRange = getTrailingJstDateRange(30);
  const selectedWordPressPostSection = url
    ? loadOptional(getWordPressPostByUrl(url))
    : Promise.resolve({
        data: null,
        error: null,
      });
  const wordpressCandidatesSection = loadOptional(
    getWordPressPosts({
      search: urlSearch ?? url ?? null,
      postStatus: "publish",
      limit: 20,
    }),
  );

  const [selectedWordPressPostResult, wordpressCandidatesResult] = await Promise.all([
    selectedWordPressPostSection,
    wordpressCandidatesSection,
  ]);
  const selectedWordPressPost = selectedWordPressPostResult.data;
  const selectedWpPostId =
    selectedWordPressPost?.wp_post_id === undefined ||
    selectedWordPressPost?.wp_post_id === null
      ? null
      : Number(selectedWordPressPost.wp_post_id);

  const [urlCandidates, history, comparisons, opportunities] = await Promise.all([
    getPageCandidates({
      ...candidateRange,
      urlSearch: urlSearch ?? url,
      pillarSearch,
      clusterSearch,
      limit: 12,
    }),
    getRewriteHistory({
      ...range,
      wpPostId: selectedWpPostId,
      url,
      urlSearch,
      pillarSearch,
      clusterSearch,
      limit: 24,
    }),
    getRewriteBeforeAfterComparison({
      ...range,
      wpPostId: selectedWpPostId,
      url,
      urlSearch,
      pillarSearch,
      clusterSearch,
      windowDays: impactWindow,
      limit: 12,
    }),
    getRewriteOpportunityCandidates({
      ...candidateRange,
      urlSearch,
      pillarSearch,
      clusterSearch,
      limit: 8,
    }),
  ]);

  const wordpressCandidates = wordpressCandidatesResult.data ?? [];

  if (
    selectedWordPressPost &&
    !wordpressCandidates.some(
      (candidate) => candidate.wp_post_id === selectedWordPressPost.wp_post_id,
    )
  ) {
    wordpressCandidates.unshift(selectedWordPressPost);
  }

  const trackedKeywordContext = url
    ? (
        await getTrackedKeywords({
          targetUrlSearch: url,
          pillarSearch,
          clusterSearch,
          statusFilter: true,
          limit: 20,
        })
      ).filter((row) => row.target_url === url)
    : [];

  return {
    range,
    urlCandidates,
    history,
    comparisons,
    opportunities,
    trackedKeywordContext,
    selectedWordPressPost,
    wordpressCandidates,
    wordpressWarning:
      selectedWordPressPostResult.error ?? wordpressCandidatesResult.error,
  };
}

function UrlCandidateList({
  rows,
  days,
  impactWindow,
  pillarSearch,
  clusterSearch,
}: {
  rows: PageCandidateRow[];
  days: number;
  impactWindow: number;
  pillarSearch?: string;
  clusterSearch?: string;
}) {
  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ArrowRightLeft className="h-4 w-4 text-primary" />
        <span>対象 URL 候補</span>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => {
            const params = new URLSearchParams();

            params.set("url", row.url);
            params.set("days", String(days));
            params.set("impactWindow", String(impactWindow));
            appendClusterFilters(params, { pillarSearch, clusterSearch });

            return (
              <Link
                key={row.url}
                className="block rounded-2xl border border-border/70 bg-background/70 px-4 py-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
                href={`/rewrites?${params.toString()}`}
              >
                <p className="break-all text-sm font-medium leading-6">{row.url}</p>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-5">
                  <p>Clicks: {formatMetricNumber(row.clicks)}</p>
                  <p>Impr: {formatMetricNumber(row.impressions)}</p>
                  <p>CTR: {formatPercent(row.ctr)}</p>
                  <p>Pos: {formatPosition(row.average_position)}</p>
                  <p>Keywords: {formatMetricNumber(row.related_keywords)}</p>
                </div>
              </Link>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            最近の対象 URL 候補はまだありません。
          </p>
        )}
      </div>
    </section>
  );
}

function RewriteHistoryList({
  rows,
}: {
  rows: RewriteRecordRow[];
}) {
  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">リライト履歴一覧</p>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          latest first
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border border-border/70 bg-background/70 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{row.rewrite_date}</p>
                  {row.wp_post_title ? (
                    <p className="text-sm text-muted-foreground">{row.wp_post_title}</p>
                  ) : null}
                  <p className="break-all text-sm text-muted-foreground">{row.url}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {row.rewrite_type}
                  </p>
                  {row.wp_post_id ? (
                    <p className="text-xs text-muted-foreground">
                      Post ID: {String(row.wp_post_id)}
                    </p>
                  ) : null}
                </div>
              </div>
              {row.wp_post_url && row.wp_post_url !== row.url ? (
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  Current URL: {row.wp_post_url}
                </p>
              ) : null}
              {row.summary ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {row.summary}
                </p>
              ) : null}
              {row.memo ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {row.memo}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            表示期間内のリライト履歴はありません。
          </p>
        )}
      </div>
    </section>
  );
}

function RewriteOpportunityList({
  rows,
  impactWindow,
  pillarSearch,
  clusterSearch,
}: {
  rows: RewriteOpportunityRow[];
  impactWindow: number;
  pillarSearch?: string;
  clusterSearch?: string;
}) {
  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>リライト候補自動抽出</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        直近 30 日で impressions 500 以上、平均順位 6-20、CTR 3% 以下、かつ 30 日以内の rewrite がない URL を候補として表示します。
      </p>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => {
            const params = new URLSearchParams();

            params.set("url", row.url);
            params.set("days", "90");
            params.set("impactWindow", String(impactWindow));
            appendClusterFilters(params, { pillarSearch, clusterSearch });

            return (
              <Link
                key={row.url}
                className="block rounded-2xl border border-border/70 bg-background/70 px-4 py-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
                href={`/rewrites?${params.toString()}`}
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    {row.wp_post_title ? (
                      <p className="text-sm text-muted-foreground">{row.wp_post_title}</p>
                    ) : null}
                    <p className="break-all text-sm font-medium leading-6">{row.url}</p>
                    <p className="text-sm text-muted-foreground">
                      Last rewrite: {row.latest_rewrite_date ?? "未登録"}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Gap:{" "}
                    {coerceNumber(row.days_since_last_rewrite) === null
                      ? "new candidate"
                      : `${formatMetricNumber(row.days_since_last_rewrite)} days`}
                  </p>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-5">
                  <p>Impr: {formatMetricNumber(row.total_impressions)}</p>
                  <p>Clicks: {formatMetricNumber(row.total_clicks)}</p>
                  <p>CTR: {formatPercent(row.ctr)}</p>
                  <p>Pos: {formatPosition(row.average_position)}</p>
                  <p>Keywords: {formatMetricNumber(row.tracked_keywords)}</p>
                </div>
              </Link>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            いまの条件に合う候補 URL はありません。
          </p>
        )}
      </div>
    </section>
  );
}

export default async function RewritesPage({ searchParams }: RewritesPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const url = normalizeFilter(readSearchParam(resolvedSearchParams.url));
  const urlSearch = normalizeFilter(readSearchParam(resolvedSearchParams.urlSearch));
  const pillarSearch = normalizeFilter(readSearchParam(resolvedSearchParams.pillar));
  const clusterSearch = normalizeFilter(readSearchParam(resolvedSearchParams.cluster));
  const days = clampDays(readSearchParam(resolvedSearchParams.days));
  const impactWindow = clampImpactWindow(
    readSearchParam(resolvedSearchParams.impactWindow),
  );

  let pageData:
    | Awaited<ReturnType<typeof loadRewritesPageData>>
    | null = null;
  let pageError: string | null = null;

  try {
    pageData = await loadRewritesPageData({
      url,
      urlSearch,
      days,
      impactWindow,
      pillarSearch,
      clusterSearch,
    });
  } catch (error) {
    pageError =
      error instanceof Error ? error.message : "Failed to load rewrite data";
  }

  const rewriteCount = pageData?.history.length ?? 0;
  const urlOptions = [
    ...new Set(
      [
        ...(pageData?.urlCandidates ?? []).map((row) => row.url),
        ...(pageData?.wordpressCandidates ?? []).map((row) => row.url),
      ].filter(Boolean),
    ),
  ];
  const selectedWordPressPost: WordPressPostRow | null =
    pageData?.selectedWordPressPost ?? null;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-[2rem] border border-border/70 bg-card/80 p-8 shadow-sm md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1 text-sm font-medium text-secondary-foreground">
            <ArrowRightLeft className="h-4 w-4" />
            Rewrite tracker
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Register edits, then measure what changed.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              `rewrites` を基点に、施策日、要約メモ、前後 7 日または 14 日の順位変化、次に触るべき URL 候補をまとめて確認します。
            </p>
          </div>
          <form className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 md:grid-cols-2 xl:grid-cols-[1fr_220px_220px_160px_160px_auto]">
            {url ? <input name="url" type="hidden" value={url} /> : null}
            <label className="space-y-2 text-sm">
              <span className="font-medium">URL filter</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={urlSearch ?? ""}
                name="urlSearch"
                placeholder="https://prosports.yoshilover.com/..."
                type="text"
              />
            </label>
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
              <span className="font-medium">Window</span>
              <select
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={String(days)}
                name="days"
              >
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="180">180 days</option>
              </select>
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Impact window</span>
              <select
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={String(impactWindow)}
                name="impactWindow"
              >
                <option value="7">7 days</option>
                <option value="14">14 days</option>
              </select>
            </label>
            <div className="flex items-end gap-3">
              <Button className="gap-2" type="submit">
                <Search className="h-4 w-4" />
                Apply
              </Button>
              <Link
                className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
                href="/rewrites"
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
                URL
              </p>
              <p className="mt-2 break-all text-lg font-semibold">{url ?? "未選択"}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Rewrite count
              </p>
              <p className="mt-2 text-lg font-semibold">{rewriteCount}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                WordPress article
              </p>
              <p className="mt-2 text-lg font-semibold">
                {selectedWordPressPost?.title ?? "未選択"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedWordPressPost?.wp_post_id
                  ? `Post ID: ${String(selectedWordPressPost.wp_post_id)}`
                  : "URL のみで登録できます"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Comparison rule
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                rewrite 当日は除外し、前後 {impactWindow} 日の GSC 指標を比較します。
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Cluster filter
              </p>
              <p className="mt-2 text-lg font-semibold">
                {clusterSearch ?? pillarSearch ?? "all clusters"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {pageError ? (
        <div className="rounded-[1.75rem] border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Rewrite data could not be loaded
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{pageError}</p>
        </div>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <RewriteRegistrationForm
          currentUrlSearch={urlSearch}
          days={days}
          impactWindow={impactWindow}
          defaultRewriteDate={toJstDateString()}
          initialUrl={url}
          initialWpPostId={selectedWordPressPost?.wp_post_id ?? null}
          wordpressOptions={pageData?.wordpressCandidates ?? []}
          wordpressWarning={pageData?.wordpressWarning ?? null}
          urlOptions={urlOptions}
        />
        <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
          <p className="text-sm font-medium">運用メモ</p>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>
              期間: {pageData?.range.startDate ?? "--"} から{" "}
              {pageData?.range.endDate ?? "--"}
            </p>
            <p>比較窓: rewrite 前後それぞれ {impactWindow} 日</p>
            <p>Cluster filter: {clusterSearch ?? pillarSearch ?? "なし"}</p>
            <p>
              `pages` 画面では URL 単位の履歴確認、`keywords` 画面では marker 確認ができます。
            </p>
            {pageData?.wordpressWarning ? (
              <p>WordPress 候補の読込では warning が出ています: {pageData.wordpressWarning}</p>
            ) : null}
          </div>
        </section>
      </section>

      {url ? (
        <TrackedKeywordContextPanel
          days={days}
          emptyMessage="この URL に一致する tracked keyword の cluster 情報はありません。"
          rows={pageData?.trackedKeywordContext ?? []}
          title="Cluster context"
        />
      ) : null}

      <UrlCandidateList
        clusterSearch={clusterSearch}
        days={days}
        impactWindow={impactWindow}
        pillarSearch={pillarSearch}
        rows={pageData?.urlCandidates ?? []}
      />

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <RewriteHistoryList rows={pageData?.history ?? []} />
        <RewriteImpactList
          rows={pageData?.comparisons ?? []}
          windowDays={impactWindow}
        />
      </section>

      <RewriteOpportunityList
        clusterSearch={clusterSearch}
        impactWindow={impactWindow}
        pillarSearch={pillarSearch}
        rows={pageData?.opportunities ?? []}
      />
    </div>
  );
}
