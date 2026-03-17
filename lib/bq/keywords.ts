import { runNamedQuery } from "@/lib/bq/query-runner";
import type {
  KeywordCandidateRow,
  KeywordRewriteMarkerRow,
  KeywordSummaryRow,
  KeywordTargetUrlRow,
  KeywordTrendRow,
} from "@/lib/bq/types";

type KeywordWindowInput = {
  startDate: string;
  endDate: string;
  keyword: string;
  url?: string | null;
  pillarSearch?: string | null;
  clusterSearch?: string | null;
};

function normalizeNullableFilter(value?: string | null) {
  return value && value.length > 0 ? value : null;
}

/**
 * Returns top keyword candidates for discovery and default navigation.
 */
export async function getKeywordCandidates({
  startDate,
  endDate,
  keywordSearch,
  pillarSearch,
  clusterSearch,
  limit = 12,
}: {
  startDate: string;
  endDate: string;
  keywordSearch?: string | null;
  pillarSearch?: string | null;
  clusterSearch?: string | null;
  limit?: number;
}) {
  return runNamedQuery<KeywordCandidateRow>("keyword_candidates", {
    start_date: startDate,
    end_date: endDate,
    keyword_search: normalizeNullableFilter(keywordSearch),
    pillar_search: normalizeNullableFilter(pillarSearch),
    cluster_search: normalizeNullableFilter(clusterSearch),
    limit,
  });
}

/**
 * Returns summary cards for one keyword and optional URL focus.
 */
export async function getKeywordSummary({
  startDate,
  endDate,
  keyword,
  url,
  pillarSearch,
  clusterSearch,
}: KeywordWindowInput) {
  const rows = await runNamedQuery<KeywordSummaryRow>("keyword_summary", {
    start_date: startDate,
    end_date: endDate,
    keyword,
    url: normalizeNullableFilter(url),
    pillar_search: normalizeNullableFilter(pillarSearch),
    cluster_search: normalizeNullableFilter(clusterSearch),
  });

  return rows[0] ?? null;
}

/**
 * Returns the keyword-specific daily trend used by the client chart.
 */
export async function getKeywordDailyTrend({
  startDate,
  endDate,
  keyword,
  url,
  pillarSearch,
  clusterSearch,
}: KeywordWindowInput) {
  return runNamedQuery<KeywordTrendRow>("keyword_daily_trend", {
    start_date: startDate,
    end_date: endDate,
    keyword,
    url: normalizeNullableFilter(url),
    pillar_search: normalizeNullableFilter(pillarSearch),
    cluster_search: normalizeNullableFilter(clusterSearch),
  });
}

/**
 * Returns the URLs currently receiving impressions for the selected keyword.
 */
export async function getKeywordTargetUrls({
  startDate,
  endDate,
  keyword,
  pillarSearch,
  clusterSearch,
  limit = 8,
}: {
  startDate: string;
  endDate: string;
  keyword: string;
  pillarSearch?: string | null;
  clusterSearch?: string | null;
  limit?: number;
}) {
  return runNamedQuery<KeywordTargetUrlRow>("keyword_target_urls", {
    start_date: startDate,
    end_date: endDate,
    keyword,
    pillar_search: normalizeNullableFilter(pillarSearch),
    cluster_search: normalizeNullableFilter(clusterSearch),
    limit,
  });
}

/**
 * Returns rewrite markers for URLs associated with the selected keyword.
 */
export async function getKeywordRewriteMarkers({
  startDate,
  endDate,
  keyword,
  url,
  pillarSearch,
  clusterSearch,
}: KeywordWindowInput) {
  return runNamedQuery<KeywordRewriteMarkerRow>("keyword_rewrite_markers", {
    start_date: startDate,
    end_date: endDate,
    keyword,
    url: normalizeNullableFilter(url),
    pillar_search: normalizeNullableFilter(pillarSearch),
    cluster_search: normalizeNullableFilter(clusterSearch),
  });
}
