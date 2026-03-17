import { runNamedQuery } from "@/lib/bq/query-runner";
import type {
  PageCandidateRow,
  PageInternalLinkSummaryRow,
  PageRelatedKeywordRow,
  PageRewriteHistoryRow,
  PageSummaryRow,
} from "@/lib/bq/types";

/**
 * Returns top page candidates for discovery and page-level drilldowns.
 */
export async function getPageCandidates({
  startDate,
  endDate,
  urlSearch,
  pillarSearch,
  clusterSearch,
  limit = 12,
}: {
  startDate: string;
  endDate: string;
  urlSearch?: string | null;
  pillarSearch?: string | null;
  clusterSearch?: string | null;
  limit?: number;
}) {
  return runNamedQuery<PageCandidateRow>("page_candidates", {
    start_date: startDate,
    end_date: endDate,
    url_search: urlSearch?.trim() ? urlSearch.trim() : null,
    pillar_search: pillarSearch?.trim() ? pillarSearch.trim() : null,
    cluster_search: clusterSearch?.trim() ? clusterSearch.trim() : null,
    limit,
  });
}

/**
 * Returns top-level KPI summary for one URL.
 */
export async function getPageSummary({
  startDate,
  endDate,
  url,
}: {
  startDate: string;
  endDate: string;
  url: string;
}) {
  const rows = await runNamedQuery<PageSummaryRow>("page_summary", {
    start_date: startDate,
    end_date: endDate,
    url,
  });

  return rows[0] ?? null;
}

/**
 * Returns related keywords for a selected URL.
 */
export async function getPageRelatedKeywords({
  startDate,
  endDate,
  url,
  limit = 12,
}: {
  startDate: string;
  endDate: string;
  url: string;
  limit?: number;
}) {
  return runNamedQuery<PageRelatedKeywordRow>("page_related_keywords", {
    start_date: startDate,
    end_date: endDate,
    url,
    limit,
  });
}

/**
 * Returns rewrite history for one URL in the selected date window.
 */
export async function getPageRewriteHistory({
  startDate,
  endDate,
  wpPostId,
  url,
  limit = 12,
}: {
  startDate: string;
  endDate: string;
  wpPostId?: number | null;
  url: string;
  limit?: number;
}) {
  return runNamedQuery<PageRewriteHistoryRow>("page_rewrite_history", {
    start_date: startDate,
    end_date: endDate,
    wp_post_id: wpPostId ?? null,
    url,
    limit,
  });
}

/**
 * Returns outbound and inbound internal-link counts for one URL.
 */
export async function getPageInternalLinkSummary({
  url,
}: {
  url: string;
}) {
  const rows = await runNamedQuery<PageInternalLinkSummaryRow>(
    "page_internal_link_summary",
    {
      url,
    },
  );

  return rows[0] ?? null;
}
