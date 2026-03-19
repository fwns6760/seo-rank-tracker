import Link from "next/link";
import {
  AlertTriangle,
  ArrowRightLeft,
  FilterX,
  Link2,
  Search,
} from "lucide-react";

import { InternalLinkImpactList } from "@/components/internal-link-impact-list";
import { InternalLinkEventForm } from "@/components/internal-link-event-form";
import { InternalLinkEventHistoryList } from "@/components/internal-link-event-history-list";
import { RewriteImpactList } from "@/components/rewrite-impact-list";
import { TrackedKeywordContextPanel } from "@/components/tracked-keyword-context-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  getInternalLinkEventBeforeAfterComparison,
  getInternalLinkEventHistory,
  getPageCandidates,
  getPageInternalLinkSummary,
  getPageRelatedKeywords,
  getRewriteBeforeAfterComparison,
  getPageRewriteHistory,
  getPageSummary,
  getTrackedKeywords,
  getWordPressPostByUrl,
} from "@/lib/bq";
import type {
  PageCandidateRow,
  PageInternalLinkSummaryRow,
  PageRelatedKeywordRow,
  PageRewriteHistoryRow,
  PageSummaryRow,
  WordPressPostRow,
} from "@/lib/bq";
import { getTrailingJstDateRange } from "@/lib/time/jst";
import { cn } from "@/lib/utils";

type SearchParamsValue = string | string[] | undefined;

type PagesPageProps = {
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

async function loadPagesData({
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

  const candidates = await getPageCandidates({
    ...candidateRange,
    urlSearch,
    pillarSearch,
    clusterSearch,
    limit: 12,
  });

  if (!url) {
    return {
      candidates,
      trackedKeywordContext: [],
      summary: null,
      relatedKeywords: [],
      rewriteHistory: [],
      rewriteError: null,
      rewriteComparisons: [],
      rewriteComparisonError: null,
      internalLinkEvents: [],
      internalLinkEventError: null,
      internalLinkImpactComparisons: [],
      internalLinkImpactError: null,
      internalLinkSummary: null,
      internalLinkError: null,
      selectedWordPressPost: null,
      wordpressWarning: null,
      range,
    };
  }

  const [summary, relatedKeywords, wordpressSection, linkSection, trackedKeywordRows] =
    await Promise.all([
    getPageSummary({
      ...range,
      url,
    }),
    getPageRelatedKeywords({
      ...range,
      url,
      limit: 12,
    }),
    loadOptional(
      getWordPressPostByUrl(url),
    ),
    loadOptional(
      getPageInternalLinkSummary({
        url,
      }),
    ),
    getTrackedKeywords({
      targetUrlSearch: url,
      pillarSearch,
      clusterSearch,
      statusFilter: true,
      limit: 20,
    }),
  ]);
  const trackedKeywordContext = trackedKeywordRows.filter((row) => row.target_url === url);

  const selectedWordPressPost = wordpressSection.data;
  const selectedWpPostId =
    selectedWordPressPost?.wp_post_id === undefined ||
    selectedWordPressPost?.wp_post_id === null
      ? null
      : Number(selectedWordPressPost.wp_post_id);
  const rewriteSection = await loadOptional(
    getPageRewriteHistory({
      ...range,
      wpPostId: selectedWpPostId,
      url,
      limit: 12,
    }),
  );
  const rewriteComparisonSection = await loadOptional(
    getRewriteBeforeAfterComparison({
      ...range,
      wpPostId: selectedWpPostId,
      url,
      windowDays: impactWindow,
      limit: 8,
    }),
  );
  const internalLinkEventSection = await loadOptional(
    getInternalLinkEventHistory({
      ...range,
      wpPostId: selectedWpPostId,
      url,
      limit: 8,
    }),
  );
  const internalLinkImpactSection = await loadOptional(
    getInternalLinkEventBeforeAfterComparison({
      ...range,
      wpPostId: selectedWpPostId,
      url,
      windowDays: impactWindow,
      limit: 8,
    }),
  );

  return {
    candidates,
    summary,
    relatedKeywords,
    rewriteHistory: rewriteSection.data ?? [],
    rewriteError: rewriteSection.error ?? wordpressSection.error,
    rewriteComparisons: rewriteComparisonSection.data ?? [],
    rewriteComparisonError: rewriteComparisonSection.error,
    internalLinkEvents: internalLinkEventSection.data ?? [],
    internalLinkEventError: internalLinkEventSection.error,
    internalLinkImpactComparisons: internalLinkImpactSection.data ?? [],
    internalLinkImpactError: internalLinkImpactSection.error,
    internalLinkSummary: linkSection.data,
    internalLinkError: linkSection.error,
    selectedWordPressPost,
    trackedKeywordContext,
    wordpressWarning: wordpressSection.error,
    range,
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
      <p className="mt-3 text-3xl font-semibold tracking-tight break-all">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}

function PageCandidateList({
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
    <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ArrowRightLeft className="h-4 w-4 text-primary" />
        <span>候補ページ</span>
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
                href={`/pages?${params.toString()}`}
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
            表示できるページ候補はまだありません。
          </p>
        )}
      </div>
    </div>
  );
}

function RelatedKeywordsList({
  rows,
  days,
  selectedUrl,
  pillarSearch,
  clusterSearch,
}: {
  rows: PageRelatedKeywordRow[];
  days: number;
  selectedUrl?: string;
  pillarSearch?: string;
  clusterSearch?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
        <p className="text-sm font-medium">関連キーワード一覧</p>
        <p className="mt-4 text-sm text-muted-foreground">
          この URL に紐づく keyword はまだありません。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <p className="text-sm font-medium">関連キーワード一覧</p>
      <div className="mt-4 space-y-3">
        {rows.map((row) => {
          const params = new URLSearchParams();

          params.set("keyword", row.keyword);
          params.set("days", String(days));
          if (selectedUrl) {
            params.set("url", selectedUrl);
          }
          appendClusterFilters(params, { pillarSearch, clusterSearch });

          return (
            <div
              key={row.keyword}
              className="rounded-2xl border border-border/70 bg-background/70 px-4 py-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <Link
                  className="text-sm font-medium leading-6 hover:text-primary"
                  href={`/keywords?${params.toString()}`}
                >
                  {row.keyword}
                </Link>
              <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-5">
                <p>Clicks: {formatMetricNumber(row.clicks)}</p>
                <p>Impr: {formatMetricNumber(row.impressions)}</p>
                <p>CTR: {formatPercent(row.ctr)}</p>
                <p>Pos: {formatPosition(row.average_position)}</p>
                <p>
                  Scrape:{" "}
                  {coerceNumber(row.average_scrape_position) === null
                    ? "未取得"
                    : formatPosition(row.average_scrape_position)}
                </p>
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RewriteHistoryList({
  rows,
  selectedUrl,
  warning,
  pillarSearch,
  clusterSearch,
}: {
  rows: PageRewriteHistoryRow[];
  selectedUrl?: string;
  warning: string | null;
  pillarSearch?: string;
  clusterSearch?: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ArrowRightLeft className="h-4 w-4 text-primary" />
          <span>リライト履歴</span>
        </div>
        {selectedUrl ? (
          <Link
            className="text-sm font-medium text-primary hover:underline"
            href={
              (() => {
                const params = new URLSearchParams();

                params.set("url", selectedUrl);
                params.set("days", "90");
                appendClusterFilters(params, { pillarSearch, clusterSearch });

                return `/rewrites?${params.toString()}`;
              })()
            }
          >
            `/rewrites`
          </Link>
        ) : null}
      </div>
      {warning ? (
        <p className="mt-3 text-sm text-muted-foreground">
          rewrite データはまだ利用できません: {warning}
        </p>
      ) : rows.length > 0 ? (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <div
              key={`${row.rewrite_date}:${row.updated_at}:${row.rewrite_type}:${row.url}`}
              className="rounded-2xl border border-border/70 bg-background/70 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{row.rewrite_date}</p>
                  {row.wp_post_title ? (
                    <p className="text-sm text-muted-foreground">{row.wp_post_title}</p>
                  ) : null}
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
              {row.url !== selectedUrl ? (
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  Logged URL: {row.url}
                </p>
              ) : null}
              {row.wp_post_url && row.wp_post_url !== row.url ? (
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  Current URL: {row.wp_post_url}
                </p>
              ) : null}
              {row.summary ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{row.summary}</p>
              ) : null}
              {row.memo ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{row.memo}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          表示期間内のリライト履歴はありません。
        </p>
      )}
    </div>
  );
}

function InternalLinkPanel({
  summary,
  warning,
}: {
  summary: PageInternalLinkSummaryRow | null;
  warning: string | null;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Link2 className="h-4 w-4 text-primary" />
        <span>内部リンク状況</span>
      </div>
      {warning ? (
        <p className="mt-3 text-sm text-muted-foreground">
          internal_links データはまだ利用できません: {warning}
        </p>
      ) : summary ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              発リンク数
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatMetricNumber(summary.outgoing_links)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              404: {formatMetricNumber(summary.broken_outgoing_links)}
            </p>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              被リンク数
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatMetricNumber(summary.incoming_links)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              404: {formatMetricNumber(summary.broken_incoming_links)}
            </p>
          </div>
          <p className="col-span-full text-sm text-muted-foreground">
            最新 crawl 日: {summary.latest_crawl_date ?? "未取得"}
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          内部リンク crawl データは未取得です。
        </p>
      )}
    </div>
  );
}

export default async function PagesPage({ searchParams }: PagesPageProps) {
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
    | Awaited<ReturnType<typeof loadPagesData>>
    | null = null;
  let pageError: string | null = null;

  try {
    pageData = await loadPagesData({
      url,
      urlSearch,
      days,
      impactWindow,
      pillarSearch,
      clusterSearch,
    });
  } catch (error) {
    pageError =
      error instanceof Error ? error.message : "Failed to load page-level data";
  }

  const summary: PageSummaryRow | null = pageData?.summary ?? null;
  const selectedWordPressPost: WordPressPostRow | null =
    pageData?.selectedWordPressPost ?? null;

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-[2rem] border border-border/70 bg-card/80 p-8 shadow-sm md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1 text-sm font-medium text-secondary-foreground">
            <ArrowRightLeft className="h-4 w-4" />
            Page explorer
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Evaluate one URL across ranking, rewrite, and link context.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              Page-level SEO metrics are grouped here so you can judge rewrite
              priority, keyword coverage, and internal-link support in one view.
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
                href="/pages"
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
                WordPress article
              </p>
              <p className="mt-2 text-lg font-semibold">
                {selectedWordPressPost?.title ?? "未同期"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedWordPressPost?.wp_post_id
                  ? `Post ID: ${String(selectedWordPressPost.wp_post_id)}`
                  : "wp_posts 未紐付け"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Window
              </p>
              <p className="mt-2 text-lg font-semibold">{days} days</p>
              <p className="mt-2 text-sm text-muted-foreground">
                impact: {impactWindow} days
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
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Null / 未取得
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                スクレイピング順位や internal_links が未取得のときは `未取得` と表示し、0 とは区別します。
              </p>
            </div>
          </div>
        </div>
      </section>

      {pageError ? (
        <div className="rounded-[1.75rem] border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Page data could not be loaded
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{pageError}</p>
        </div>
      ) : null}

      <PageCandidateList
        clusterSearch={clusterSearch}
        rows={pageData?.candidates ?? []}
        days={days}
        impactWindow={impactWindow}
        pillarSearch={pillarSearch}
      />

      {url ? (
        <>
          <TrackedKeywordContextPanel
            days={days}
            emptyMessage="この URL に一致する tracked keyword の cluster 情報はありません。"
            rows={pageData?.trackedKeywordContext ?? []}
            title="Cluster context"
          />

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="表示回数"
              note="期間内 impressions 合計"
              value={formatMetricNumber(summary?.total_impressions)}
            />
            <MetricCard
              label="クリック数"
              note="期間内 clicks 合計"
              value={formatMetricNumber(summary?.total_clicks)}
            />
            <MetricCard
              label="CTR"
              note="未取得とは区別して表示"
              value={formatPercent(summary?.ctr)}
            />
            <MetricCard
              label="GSC 平均順位"
              note="対象 URL の平均ポジション"
              value={formatPosition(summary?.average_position)}
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <RelatedKeywordsList
              clusterSearch={clusterSearch}
              days={days}
              pillarSearch={pillarSearch}
              rows={pageData?.relatedKeywords ?? []}
              selectedUrl={url}
            />
            <div className="space-y-5">
              <MetricCard
                label="スクレイピング順位"
                note="補助データ。未取得時は null のまま扱う"
                value={formatPosition(summary?.average_scrape_position)}
              />
              <MetricCard
                label="関連キーワード数"
                note="この URL に紐づく query 数"
                value={formatMetricNumber(summary?.related_keywords)}
              />
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <RewriteHistoryList
              clusterSearch={clusterSearch}
              pillarSearch={pillarSearch}
              rows={pageData?.rewriteHistory ?? []}
              selectedUrl={url}
              warning={pageData?.rewriteError ?? null}
            />
            <InternalLinkPanel
              summary={pageData?.internalLinkSummary ?? null}
              warning={pageData?.internalLinkError ?? null}
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <RewriteImpactList
              rows={pageData?.rewriteComparisons ?? []}
              warning={pageData?.rewriteComparisonError ?? null}
              windowDays={impactWindow}
            />
            <InternalLinkImpactList
              rows={pageData?.internalLinkImpactComparisons ?? []}
              warning={pageData?.internalLinkImpactError ?? null}
              windowDays={impactWindow}
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <InternalLinkEventForm
              currentUrlSearch={urlSearch}
              days={days}
              impactWindow={impactWindow}
              defaultChangeDate={pageData?.range.endDate ?? ""}
              initialUrl={url}
              initialWpPostId={selectedWordPressPost?.wp_post_id ?? null}
              pagePath="/pages"
              successQueryKey="url"
              wordpressOptions={selectedWordPressPost ? [selectedWordPressPost] : []}
              wordpressWarning={pageData?.wordpressWarning ?? null}
            />
            <InternalLinkEventHistoryList
              emptyMessage="表示期間内の内部リンク施策はありません。"
              rows={pageData?.internalLinkEvents ?? []}
              title="内部リンク施策履歴"
              warning={pageData?.internalLinkEventError ?? null}
            />
          </section>

          <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
            <p className="text-sm font-medium">補助メモ</p>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
              <p>
                期間: {pageData?.range.startDate ?? "--"} から{" "}
                {pageData?.range.endDate ?? "--"}
              </p>
              <p>施策比較窓: 前後それぞれ {impactWindow} 日</p>
              <p>最新取得日: {summary?.latest_date ?? "未取得"}</p>
              <p>
                キーワード詳細は{" "}
                <Link
                  className="font-medium text-primary hover:underline"
                  href={
                    (() => {
                      const params = new URLSearchParams();

                      params.set("url", url);
                      params.set("days", String(days));
                      appendClusterFilters(params, { pillarSearch, clusterSearch });

                      return `/keywords?${params.toString()}`;
                    })()
                  }
                >
                  `/keywords`
                </Link>{" "}
                から確認できます。
              </p>
              <p>
                rewrite 登録と比較は{" "}
                <Link
                  className="font-medium text-primary hover:underline"
                  href={
                    (() => {
                      const params = new URLSearchParams();

                      params.set("url", url);
                      params.set("days", String(days));
                      params.set("impactWindow", String(impactWindow));
                      appendClusterFilters(params, { pillarSearch, clusterSearch });

                      return `/rewrites?${params.toString()}`;
                    })()
                  }
                >
                  `/rewrites`
                </Link>{" "}
                から行えます。
              </p>
              <p>
                内部リンク施策はこの画面か{" "}
                <Link
                  className="font-medium text-primary hover:underline"
                  href={
                    (() => {
                      const params = new URLSearchParams();

                      params.set("urlSearch", url);
                      params.set("days", String(days));
                      params.set("impactWindow", String(impactWindow));
                      appendClusterFilters(params, { pillarSearch, clusterSearch });

                      return `/links?${params.toString()}`;
                    })()
                  }
                >
                  `/links`
                </Link>{" "}
                で別管理します。
              </p>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-[1.75rem] border border-dashed border-border bg-card/70 p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Page detail
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            まず URL を選んでください
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            候補ページから選ぶか、URL filter で絞ると、表示回数、クリック数、CTR、関連キーワード、rewrite 履歴、内部リンク状況をまとめて確認できます。
          </p>
        </section>
      )}
    </div>
  );
}
