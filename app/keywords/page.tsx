import Link from "next/link";
import {
  AlertTriangle,
  FilterX,
  Link2,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { KeywordTrendChart } from "@/components/keyword-trend-chart";
import { TrackedKeywordContextPanel } from "@/components/tracked-keyword-context-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  getKeywordCandidates,
  getKeywordDailyTrend,
  getKeywordRewriteMarkers,
  getKeywordSummary,
  getKeywordTargetUrls,
  getTrackedKeywords,
} from "@/lib/bq";
import type {
  KeywordCandidateRow,
  KeywordRewriteMarkerRow,
  KeywordTargetUrlRow,
  KeywordTrendRow,
} from "@/lib/bq";
import { getTrailingJstDateRange } from "@/lib/time/jst";
import { cn } from "@/lib/utils";

type SearchParamsValue = string | string[] | undefined;

type KeywordsPageProps = {
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
  return formatMetricNumber(value, 2);
}

function toTrendPoints(rows: KeywordTrendRow[]) {
  return rows.map((row) => ({
    date: row.date,
    averagePosition: coerceNumber(row.average_position),
    averageScrapePosition: coerceNumber(row.average_scrape_position),
    clicks: coerceNumber(row.clicks) ?? 0,
    impressions: coerceNumber(row.impressions) ?? 0,
  }));
}

function toRewriteMarkers(rows: KeywordRewriteMarkerRow[]) {
  return rows.map((row) => ({
    rewriteDate: row.rewrite_date,
    rewriteType: row.rewrite_type,
    url: row.url,
  }));
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

function CandidateList({
  candidates,
  days,
  pillarSearch,
  clusterSearch,
}: {
  candidates: KeywordCandidateRow[];
  days: number;
  pillarSearch?: string;
  clusterSearch?: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Sparkles className="h-4 w-4 text-primary" />
        <span>候補キーワード</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        {candidates.length > 0 ? (
          candidates.map((candidate) => {
            const params = new URLSearchParams();

            params.set("keyword", candidate.keyword);
            params.set("days", String(days));
            appendClusterFilters(params, { pillarSearch, clusterSearch });

            return (
              <Link
                key={candidate.keyword}
                className="rounded-full border border-border/70 bg-background/80 px-4 py-2 text-sm transition-colors hover:border-primary/30 hover:bg-primary/5"
                href={`/keywords?${params.toString()}`}
              >
                {candidate.keyword}
              </Link>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            候補キーワードはまだありません。`daily_rankings` にデータ投入後に表示されます。
          </p>
        )}
      </div>
    </div>
  );
}

function TargetUrlsList({
  rows,
  keyword,
  days,
  selectedUrl,
  pillarSearch,
  clusterSearch,
}: {
  rows: KeywordTargetUrlRow[];
  keyword: string;
  days: number;
  selectedUrl?: string;
  pillarSearch?: string;
  clusterSearch?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
        <p className="text-sm font-medium">対象 URL</p>
        <p className="mt-4 text-sm text-muted-foreground">
          このキーワードに紐づく URL はまだありません。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Link2 className="h-4 w-4 text-primary" />
        <span>対象 URL</span>
      </div>
      <div className="mt-4 space-y-3">
        {rows.map((row) => {
          const isSelected = selectedUrl === row.url;
          const params = new URLSearchParams();

          params.set("keyword", keyword);
          params.set("url", row.url);
          params.set("days", String(days));
          appendClusterFilters(params, { pillarSearch, clusterSearch });

          return (
            <Link
              key={row.url}
              className={cn(
                "block rounded-2xl border px-4 py-4 transition-colors",
                isSelected
                  ? "border-primary/40 bg-primary/5"
                  : "border-border/70 bg-background/70 hover:border-primary/30 hover:bg-primary/5",
              )}
              href={`/keywords?${params.toString()}`}
            >
              <p className="break-all text-sm font-medium leading-6">{row.url}</p>
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-4">
                <p>Clicks: {formatMetricNumber(row.clicks)}</p>
                <p>Impr: {formatMetricNumber(row.impressions)}</p>
                <p>Pos: {formatPosition(row.average_position)}</p>
                <p>
                  Scrape:{" "}
                  {coerceNumber(row.average_scrape_position) === null
                    ? "未取得"
                    : formatPosition(row.average_scrape_position)}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function RewriteMarkerList({
  rows,
  pillarSearch,
  clusterSearch,
}: {
  rows: KeywordRewriteMarkerRow[];
  pillarSearch?: string;
  clusterSearch?: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">リライト実施日</p>
        <Link
          className="text-sm font-medium text-primary hover:underline"
          href={
            (() => {
              const params = new URLSearchParams();
              appendClusterFilters(params, { pillarSearch, clusterSearch });

              const query = params.toString();

              return query ? `/rewrites?${query}` : "/rewrites";
            })()
          }
        >
          `/rewrites`
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div
              key={`${row.rewrite_date}:${row.url}:${row.rewrite_type}`}
              className="rounded-2xl border border-border/70 bg-background/70 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <p className="text-sm font-medium">{row.rewrite_date}</p>
                <div className="flex items-center gap-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {row.rewrite_type}
                  </p>
                  <Link
                    className="text-sm font-medium text-primary hover:underline"
                    href={
                      (() => {
                        const params = new URLSearchParams();

                        params.set("url", row.url);
                        params.set("days", "90");
                        appendClusterFilters(params, { pillarSearch, clusterSearch });

                        return `/rewrites?${params.toString()}`;
                      })()
                    }
                  >
                    履歴詳細
                  </Link>
                </div>
              </div>
              <p className="mt-2 break-all text-sm text-muted-foreground">{row.url}</p>
              {row.summary ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {row.summary}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            表示期間内の rewrite marker はありません。
          </p>
        )}
      </div>
    </div>
  );
}

function buildPageTone(selectedKeyword?: string) {
  return selectedKeyword
    ? "Track one query across URLs, ranking sources, and rewrite markers."
    : "Pick a keyword to inspect its target URLs, average position trend, and rewrite history.";
}

async function loadKeywordPageData({
  keyword,
  url,
  days,
  pillarSearch,
  clusterSearch,
}: {
  keyword?: string;
  url?: string;
  days: number;
  pillarSearch?: string;
  clusterSearch?: string;
}) {
  const range = getTrailingJstDateRange(days);
  const candidateRange = getTrailingJstDateRange(30);
  const candidates = await getKeywordCandidates({
    ...candidateRange,
    keywordSearch: keyword,
    pillarSearch,
    clusterSearch,
    limit: 12,
  });

  if (!keyword) {
    return {
      candidates,
      keywordContext: [],
      relatedTrackedQueries: [],
      summary: null,
      trend: [],
      targetUrls: [],
      rewriteMarkers: [],
      range,
    };
  }

  const [summary, trend, targetUrls, rewriteMarkers, trackedKeywordRows] = await Promise.all([
    getKeywordSummary({
      ...range,
      keyword,
      url,
      pillarSearch,
      clusterSearch,
    }),
    getKeywordDailyTrend({
      ...range,
      keyword,
      url,
      pillarSearch,
      clusterSearch,
    }),
    getKeywordTargetUrls({
      ...range,
      keyword,
      pillarSearch,
      clusterSearch,
      limit: 8,
    }),
    getKeywordRewriteMarkers({
      ...range,
      keyword,
      url,
      pillarSearch,
      clusterSearch,
    }),
    getTrackedKeywords({
      keywordSearch: keyword,
      targetUrlSearch: url,
      pillarSearch,
      clusterSearch,
      statusFilter: true,
      limit: 20,
    }),
  ]);

  const keywordContext = trackedKeywordRows.filter(
    (row) => row.keyword === keyword && (!url || row.target_url === url),
  );
  const primaryContext = keywordContext[0] ?? null;
  const relatedTrackedQueries = primaryContext
    ? (
        await getTrackedKeywords({
          pillarSearch: primaryContext.pillar,
          clusterSearch: primaryContext.cluster,
          statusFilter: true,
          limit: 12,
        })
      ).filter(
        (row) =>
          !(row.keyword === primaryContext.keyword && row.target_url === primaryContext.target_url),
      )
    : [];

  return {
    candidates,
    keywordContext,
    relatedTrackedQueries,
    summary,
    trend,
    targetUrls,
    rewriteMarkers,
    range,
  };
}

export default async function KeywordsPage({ searchParams }: KeywordsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const keyword = normalizeFilter(readSearchParam(resolvedSearchParams.keyword));
  const url = normalizeFilter(readSearchParam(resolvedSearchParams.url));
  const pillarSearch = normalizeFilter(readSearchParam(resolvedSearchParams.pillar));
  const clusterSearch = normalizeFilter(readSearchParam(resolvedSearchParams.cluster));
  const days = clampDays(readSearchParam(resolvedSearchParams.days));

  let pageData:
    | Awaited<ReturnType<typeof loadKeywordPageData>>
    | null = null;
  let pageError: string | null = null;

  try {
    pageData = await loadKeywordPageData({
      keyword,
      url,
      days,
      pillarSearch,
      clusterSearch,
    });
  } catch (error) {
    pageError =
      error instanceof Error ? error.message : "Failed to load keyword data";
  }

  const summary = pageData?.summary;
  const trendPoints = toTrendPoints(pageData?.trend ?? []);
  const rewriteMarkers = toRewriteMarkers(pageData?.rewriteMarkers ?? []);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-[2rem] border border-border/70 bg-card/80 p-8 shadow-sm md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1 text-sm font-medium text-secondary-foreground">
            <TrendingUp className="h-4 w-4" />
            Keyword explorer
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Track one keyword, not just one chart.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              {buildPageTone(keyword)}
            </p>
          </div>
          <form className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_180px_220px_220px_auto]">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Keyword</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={keyword ?? ""}
                name="keyword"
                placeholder="例: 大谷翔平 ホームラン"
                type="text"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">URL focus</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={url ?? ""}
                name="url"
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
            <div className="flex items-end gap-3">
              <Button className="gap-2" type="submit">
                <Search className="h-4 w-4" />
                Apply
              </Button>
              <Link
                className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
                href="/keywords"
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
                Keyword
              </p>
              <p className="mt-2 text-lg font-semibold">{keyword ?? "未選択"}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                URL focus
              </p>
              <p className="mt-2 break-all text-lg font-semibold">{url ?? "All URLs"}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Cluster filter
              </p>
              <p className="mt-2 text-lg font-semibold">
                {clusterSearch ?? pillarSearch ?? "all clusters"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {clusterSearch || pillarSearch
                  ? "候補 keyword と target URL を cluster 文脈で絞り込みます。"
                  : "`rewrites` テーブルのデータがあれば chart 上に marker を出します。未登録時は空表示です。"}
              </p>
            </div>
          </div>
        </div>
      </section>

      {pageError ? (
        <div className="rounded-[1.75rem] border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Keyword data could not be loaded
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{pageError}</p>
        </div>
      ) : null}

      <CandidateList
        candidates={pageData?.candidates ?? []}
        clusterSearch={clusterSearch}
        days={days}
        pillarSearch={pillarSearch}
      />

      {keyword ? (
        <>
          <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <TrackedKeywordContextPanel
              days={days}
              emptyMessage="この keyword / URL に一致する tracked keyword の cluster 情報はありません。"
              rows={pageData?.keywordContext ?? []}
              title="Cluster context"
            />
            <TrackedKeywordContextPanel
              days={days}
              emptyMessage="同じ cluster に属する tracked query はまだありません。"
              rows={pageData?.relatedTrackedQueries ?? []}
              title="Related tracked queries"
            />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="対象 URL"
              note="対象キーワードで最も表示回数が多い URL"
              value={summary?.primary_url ?? "--"}
            />
            <MetricCard
              label="GSC 平均順位"
              note="最新取得日の平均順位"
              value={formatPosition(summary?.latest_average_position)}
            />
            <MetricCard
              label="スクレイピング順位"
              note="補助データ。未取得時は null のまま扱う"
              value={
                coerceNumber(summary?.latest_average_scrape_position) === null
                  ? "未取得"
                  : formatPosition(summary?.latest_average_scrape_position)
              }
            />
            <MetricCard
              label="追跡 URL 数"
              note="この keyword に紐づく URL の数"
              value={formatMetricNumber(summary?.tracked_urls)}
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <KeywordTrendChart markers={rewriteMarkers} points={trendPoints} />
            <RewriteMarkerList
              clusterSearch={clusterSearch}
              pillarSearch={pillarSearch}
              rows={pageData?.rewriteMarkers ?? []}
            />
          </section>

          <TargetUrlsList
            clusterSearch={clusterSearch}
            days={days}
            keyword={keyword}
            pillarSearch={pillarSearch}
            rows={pageData?.targetUrls ?? []}
            selectedUrl={url}
          />

          <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
            <p className="text-sm font-medium">補助メモ</p>
            <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
              <p>
                期間: {pageData?.range.startDate ?? "--"} から{" "}
                {pageData?.range.endDate ?? "--"}
              </p>
              <p>Clicks 合計: {formatMetricNumber(summary?.total_clicks)}</p>
              <p>Impressions 合計: {formatMetricNumber(summary?.total_impressions)}</p>
              <p>
                Cluster filter: {clusterSearch ?? pillarSearch ?? "なし"}
              </p>
            </div>
          </section>
        </>
      ) : (
        <section className="rounded-[1.75rem] border border-dashed border-border bg-card/70 p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Keyword detail
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            まず keyword を選んでください
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
            候補キーワードから選ぶか、フォームに query を入れて検索すると、対象 URL、GSC 平均順位、スクレイピング順位、rewrite marker を確認できます。
          </p>
        </section>
      )}
    </div>
  );
}
