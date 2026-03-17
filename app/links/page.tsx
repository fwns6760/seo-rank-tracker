import Link from "next/link";
import {
  AlertTriangle,
  FilterX,
  Link2,
  Search,
  ShieldAlert,
  SplinePointer,
} from "lucide-react";

import { InternalLinkImpactList } from "@/components/internal-link-impact-list";
import { InternalLinkEventForm } from "@/components/internal-link-event-form";
import { InternalLinkEventHistoryList } from "@/components/internal-link-event-history-list";
import { TrackedKeywordContextPanel } from "@/components/tracked-keyword-context-panel";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  getBrokenLinks404,
  getInternalLinkEventBeforeAfterComparison,
  getInternalLinkEventHistory,
  getLatestLinks,
  getLowInboundPages,
  getLinksLatestSummary,
  getOrphanPages,
  getTrackedKeywords,
  getWordPressPostByUrl,
  getWordPressPosts,
} from "@/lib/bq";
import type {
  InternalLinkEventRow,
  LinkRow,
  LinksSummaryRow,
  OrphanPageRow,
  WordPressPostRow,
} from "@/lib/bq";
import { getTrailingJstDateRange } from "@/lib/time/jst";
import { cn } from "@/lib/utils";

type SearchParamsValue = string | string[] | undefined;

type LinksPageProps = {
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

function formatMetricNumber(value: number | string | null | undefined) {
  const numeric = coerceNumber(value);

  if (numeric === null) {
    return "--";
  }

  return numeric.toLocaleString("ja-JP");
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

function formatStatusCode(value: number | null | undefined) {
  return value === null || value === undefined ? "未取得" : String(value);
}

function normalizeAbsoluteUrlCandidate(value?: string) {
  if (!value) {
    return undefined;
  }

  try {
    return new URL(value).toString();
  } catch {
    return undefined;
  }
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

async function loadLinksPageData({
  urlSearch,
  days,
  impactWindow,
  pillarSearch,
  clusterSearch,
}: {
  urlSearch?: string;
  days: number;
  impactWindow: number;
  pillarSearch?: string;
  clusterSearch?: string;
}) {
  const range = getTrailingJstDateRange(days);
  const selectedWordPressPostSection = urlSearch
    ? loadOptional(getWordPressPostByUrl(urlSearch))
    : Promise.resolve({
        data: null,
        error: null,
      });
  const wordpressCandidatesSection = loadOptional(
    getWordPressPosts({
      search: urlSearch ?? null,
      postStatus: "publish",
      limit: 20,
    }),
  );

  const [selectedWordPressPostResult, wordpressCandidatesResult] = await Promise.all([
    selectedWordPressPostSection,
    wordpressCandidatesSection,
  ]);
  const wordpressCandidates = wordpressCandidatesResult.data ?? [];
  const selectedWordPressPost = selectedWordPressPostResult.data;
  const selectedWpPostId =
    selectedWordPressPost?.wp_post_id === undefined ||
    selectedWordPressPost?.wp_post_id === null
      ? null
      : Number(selectedWordPressPost.wp_post_id);

  const [summary, latestLinks, brokenLinks, orphanPages, lowInboundPages, eventHistory, eventComparisons] =
    await Promise.all([
      getLinksLatestSummary({
        ...range,
        urlSearch,
        pillarSearch,
        clusterSearch,
      }),
      getLatestLinks({
        ...range,
        sourceSearch: urlSearch,
        targetSearch: urlSearch,
        pillarSearch,
        clusterSearch,
        limit: 40,
      }),
      getBrokenLinks404({
        ...range,
        sourceSearch: urlSearch,
        targetSearch: urlSearch,
        pillarSearch,
        clusterSearch,
        limit: 20,
      }),
      getOrphanPages({
        ...range,
        urlSearch,
        pillarSearch,
        clusterSearch,
        limit: 20,
      }),
      getLowInboundPages({
        ...range,
        urlSearch,
        pillarSearch,
        clusterSearch,
        limit: 20,
      }),
      getInternalLinkEventHistory({
        ...range,
        wpPostId: selectedWpPostId,
        urlSearch,
        pillarSearch,
        clusterSearch,
        limit: 16,
      }),
      getInternalLinkEventBeforeAfterComparison({
        ...range,
        wpPostId: selectedWpPostId,
        urlSearch,
        pillarSearch,
        clusterSearch,
        windowDays: impactWindow,
        limit: 12,
      }),
    ]);

  const trackedKeywordContext = urlSearch
    ? (
        await getTrackedKeywords({
          targetUrlSearch: urlSearch,
          pillarSearch,
          clusterSearch,
          statusFilter: true,
          limit: 20,
        })
      ).filter((row) => row.target_url === urlSearch)
    : [];

  if (
    selectedWordPressPost &&
    !wordpressCandidates.some(
      (candidate) => candidate.wp_post_id === selectedWordPressPost.wp_post_id,
    )
  ) {
    wordpressCandidates.unshift(selectedWordPressPost);
  }

  return {
    range,
    summary,
    latestLinks,
    brokenLinks,
    orphanPages,
    lowInboundPages,
    eventHistory,
    eventComparisons,
    trackedKeywordContext,
    selectedWordPressPost,
    wordpressCandidates,
    wordpressWarning:
      selectedWordPressPostResult.error ?? wordpressCandidatesResult.error,
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

function LinksTable({
  rows,
  title,
  emptyMessage,
}: {
  rows: LinkRow[];
  title: string;
  emptyMessage: string;
}) {
  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-4 space-y-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div
              key={`${row.crawl_date}:${row.source_url}:${row.target_url}:${row.anchor_text ?? ""}`}
              className="rounded-2xl border border-border/70 bg-background/70 p-4"
            >
              <div className="grid gap-3 md:grid-cols-[1fr_1fr_120px]">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Source URL
                  </p>
                  <p className="mt-2 break-all text-sm font-medium">{row.source_url}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Target URL
                  </p>
                  <p className="mt-2 break-all text-sm font-medium">{row.target_url}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    Status
                  </p>
                  <p className="mt-2 text-sm font-medium">
                    {formatStatusCode(row.status_code)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <p>Anchor: {row.anchor_text ?? "未設定"}</p>
                <p>Crawl date: {row.crawl_date}</p>
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

function OrphanPagesList({
  rows,
  impactWindow,
  pillarSearch,
  clusterSearch,
}: {
  rows: OrphanPageRow[];
  impactWindow: number;
  pillarSearch?: string;
  clusterSearch?: string;
}) {
  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <SplinePointer className="h-4 w-4 text-primary" />
        <span>孤立ページ</span>
      </div>
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
                href={`/pages?${params.toString()}`}
              >
                <p className="break-all text-sm font-medium leading-6">{row.url}</p>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-4">
                  <p>Impr: {formatMetricNumber(row.total_impressions)}</p>
                  <p>Clicks: {formatMetricNumber(row.total_clicks)}</p>
                  <p>Pos: {formatPosition(row.average_position)}</p>
                  <p>Inbound: {formatMetricNumber(row.incoming_links)}</p>
                </div>
              </Link>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            孤立ページ候補はありません。
          </p>
        )}
      </div>
    </section>
  );
}

function LowInboundPagesList({
  rows,
  impactWindow,
  pillarSearch,
  clusterSearch,
}: {
  rows: OrphanPageRow[];
  impactWindow: number;
  pillarSearch?: string;
  clusterSearch?: string;
}) {
  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-medium">
        <ShieldAlert className="h-4 w-4 text-primary" />
        <span>被リンク不足ページ</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        最新 crawl 時点で inbound link が 1-2 本の tracked URL を表示します。
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
                href={`/pages?${params.toString()}`}
              >
                <p className="break-all text-sm font-medium leading-6">{row.url}</p>
                <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-4">
                  <p>Impr: {formatMetricNumber(row.total_impressions)}</p>
                  <p>Clicks: {formatMetricNumber(row.total_clicks)}</p>
                  <p>Pos: {formatPosition(row.average_position)}</p>
                  <p>Inbound: {formatMetricNumber(row.incoming_links)}</p>
                </div>
              </Link>
            );
          })
        ) : (
          <p className="text-sm text-muted-foreground">
            被リンク不足ページはありません。
          </p>
        )}
      </div>
    </section>
  );
}

export default async function LinksPage({ searchParams }: LinksPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const urlSearch = normalizeFilter(readSearchParam(resolvedSearchParams.urlSearch));
  const pillarSearch = normalizeFilter(readSearchParam(resolvedSearchParams.pillar));
  const clusterSearch = normalizeFilter(readSearchParam(resolvedSearchParams.cluster));
  const days = clampDays(readSearchParam(resolvedSearchParams.days));
  const impactWindow = clampImpactWindow(
    readSearchParam(resolvedSearchParams.impactWindow),
  );

  let pageData:
    | Awaited<ReturnType<typeof loadLinksPageData>>
    | null = null;
  let pageError: string | null = null;

  try {
    pageData = await loadLinksPageData({
      urlSearch,
      days,
      impactWindow,
      pillarSearch,
      clusterSearch,
    });
  } catch (error) {
    pageError =
      error instanceof Error ? error.message : "Failed to load internal-link data";
  }

  const summary: LinksSummaryRow | null = pageData?.summary ?? null;
  const selectedWordPressPost: WordPressPostRow | null =
    pageData?.selectedWordPressPost ?? null;
  const eventHistory: InternalLinkEventRow[] = pageData?.eventHistory ?? [];
  const initialEventUrl =
    selectedWordPressPost?.url ?? normalizeAbsoluteUrlCandidate(urlSearch);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-[2rem] border border-border/70 bg-card/80 p-8 shadow-sm md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1 text-sm font-medium text-secondary-foreground">
            <Link2 className="h-4 w-4" />
            Internal link explorer
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              See internal links the way editors need them.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
              最新 crawl を基準に、内部リンク一覧、404、孤立ページ候補を横断確認します。
            </p>
          </div>
          <form className="grid gap-3 rounded-[1.5rem] border border-border/70 bg-background/70 p-4 md:grid-cols-2 xl:grid-cols-[1fr_220px_220px_160px_160px_auto]">
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
                placeholder="travel planning"
                type="text"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Cluster filter</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                defaultValue={clusterSearch ?? ""}
                name="cluster"
                placeholder="packing checklist"
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
                href="/links"
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
                Latest crawl
              </p>
              <p className="mt-2 text-lg font-semibold">
                {summary?.latest_crawl_date ?? "未取得"}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-card px-4 py-3">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Filter
              </p>
              <p className="mt-2 break-all text-lg font-semibold">{urlSearch ?? "All URLs"}</p>
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
                Internal link events
              </p>
              <p className="mt-2 text-lg font-semibold">{eventHistory.length}</p>
            </div>
          </div>
        </div>
      </section>

      {pageError ? (
        <div className="rounded-[1.75rem] border border-destructive/30 bg-destructive/5 p-5">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Internal-link data could not be loaded
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{pageError}</p>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="総内部リンク数"
          note="最新 crawl の link edge 数"
          value={formatMetricNumber(summary?.total_links)}
        />
        <MetricCard
          label="404 リンク"
          note="最新 crawl の 404 target 数"
          value={formatMetricNumber(summary?.broken_links)}
        />
        <MetricCard
          label="孤立ページ"
          note="最新 crawl で被リンク 0 の tracked URL"
          value={formatMetricNumber(summary?.orphan_pages)}
        />
        <MetricCard
          label="crawl 対象ページ"
          note="source / target の distinct URL 数"
          value={
            `${formatMetricNumber(summary?.source_pages)} / ${formatMetricNumber(summary?.target_pages)}`
          }
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <InternalLinkEventForm
          currentUrlSearch={urlSearch}
          days={days}
          impactWindow={impactWindow}
          defaultChangeDate={pageData?.range.endDate ?? ""}
          initialUrl={initialEventUrl}
          initialWpPostId={selectedWordPressPost?.wp_post_id ?? null}
          pagePath="/links"
          successQueryKey="urlSearch"
          wordpressOptions={pageData?.wordpressCandidates ?? []}
          wordpressWarning={pageData?.wordpressWarning ?? null}
        />
        <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
          <p className="text-sm font-medium">運用メモ</p>
          <div className="mt-4 space-y-3 text-sm text-muted-foreground">
            <p>
              内部リンクの追加、削除、アンカー調整だけを `internal_link_events` に保存します。
            </p>
            <p>
              本文やタイトル変更は `rewrites` に登録し、内部リンク施策とは分けて管理します。
            </p>
            <p>成果判定は change_date 当日を除いた前後 {impactWindow} 日で比較します。</p>
            <p>
              URL filter に一致する WordPress 記事候補があれば、記事選択から `wp_post_id` 付きで保存できます。
            </p>
          </div>
        </section>
      </section>

      {urlSearch ? (
        <TrackedKeywordContextPanel
          days={days}
          emptyMessage="この URL に一致する tracked keyword の cluster 情報はありません。"
          rows={pageData?.trackedKeywordContext ?? []}
          title="Cluster context"
        />
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <InternalLinkEventHistoryList
          emptyMessage="表示期間内の内部リンク施策はありません。"
          rows={eventHistory}
          title="内部リンク施策履歴"
        />
        <InternalLinkImpactList
          rows={pageData?.eventComparisons ?? []}
          windowDays={impactWindow}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <LinksTable
          emptyMessage="404 の内部リンクはありません。"
          rows={pageData?.brokenLinks ?? []}
          title="404 リンク"
        />
        <OrphanPagesList
          clusterSearch={clusterSearch}
          impactWindow={impactWindow}
          pillarSearch={pillarSearch}
          rows={pageData?.orphanPages ?? []}
        />
      </section>

      <LowInboundPagesList
        clusterSearch={clusterSearch}
        impactWindow={impactWindow}
        pillarSearch={pillarSearch}
        rows={pageData?.lowInboundPages ?? []}
      />

      <LinksTable
        emptyMessage="表示できる内部リンク一覧はまだありません。"
        rows={pageData?.latestLinks ?? []}
        title="内部リンク一覧"
      />

      <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <span>補助メモ</span>
        </div>
        <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <p>
            期間: {pageData?.range.startDate ?? "--"} から{" "}
            {pageData?.range.endDate ?? "--"}
          </p>
          <p>比較窓: 前後それぞれ {impactWindow} 日</p>
          <p>Cluster filter: {clusterSearch ?? pillarSearch ?? "なし"}</p>
          <p>orphan は `daily_rankings` にある URL を基準に判定します。</p>
          <p>被リンク不足は inbound link 1-2 本の URL として扱います。</p>
          <p>ページ単位の発リンク / 被リンク数は `/pages` から確認できます。</p>
        </div>
      </section>
    </div>
  );
}
