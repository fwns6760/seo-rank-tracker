import { runNamedQuery } from "@/lib/bq/query-runner";
import type {
  InternalLinkEventComparisonRow,
  InternalLinkEventRow,
} from "@/lib/bq/types";
import type { InternalLinkEventInput } from "@/lib/validators/internal-link-events";

/**
 * Returns internal-link events for one filter window.
 */
export async function getInternalLinkEventHistory({
  startDate,
  endDate,
  wpPostId,
  url,
  urlSearch,
  pillarSearch,
  clusterSearch,
  limit = 20,
}: {
  startDate: string;
  endDate: string;
  wpPostId?: number | null;
  url?: string | null;
  urlSearch?: string | null;
  pillarSearch?: string | null;
  clusterSearch?: string | null;
  limit?: number;
}) {
  return runNamedQuery<InternalLinkEventRow>("internal_link_event_history", {
    start_date: startDate,
    end_date: endDate,
    wp_post_id: wpPostId ?? null,
    url: url?.trim() ? url.trim() : null,
    url_search: urlSearch?.trim() ? urlSearch.trim() : null,
    pillar_search: pillarSearch?.trim() ? pillarSearch.trim() : null,
    cluster_search: clusterSearch?.trim() ? clusterSearch.trim() : null,
    limit,
  });
}

/**
 * Returns before/after KPI and crawl comparisons around each internal-link event.
 */
export async function getInternalLinkEventBeforeAfterComparison({
  startDate,
  endDate,
  wpPostId,
  url,
  urlSearch,
  pillarSearch,
  clusterSearch,
  windowDays = 7,
  limit = 12,
}: {
  startDate: string;
  endDate: string;
  wpPostId?: number | null;
  url?: string | null;
  urlSearch?: string | null;
  pillarSearch?: string | null;
  clusterSearch?: string | null;
  windowDays?: number;
  limit?: number;
}) {
  return runNamedQuery<InternalLinkEventComparisonRow>(
    "internal_link_event_before_after_comparison",
    {
      start_date: startDate,
      end_date: endDate,
      wp_post_id: wpPostId ?? null,
      url: url?.trim() ? url.trim() : null,
      url_search: urlSearch?.trim() ? urlSearch.trim() : null,
      pillar_search: pillarSearch?.trim() ? pillarSearch.trim() : null,
      cluster_search: clusterSearch?.trim() ? clusterSearch.trim() : null,
      window_days: Math.max(1, windowDays),
      limit,
    },
  );
}

/**
 * Inserts one internal-link event into BigQuery and returns the created row.
 */
export async function createInternalLinkEvent(input: InternalLinkEventInput) {
  const now = new Date().toISOString();
  const event: InternalLinkEventRow = {
    id: `internal-link-event-${crypto.randomUUID()}`,
    wp_post_id: input.wpPostId,
    wp_post_url: null,
    wp_post_slug: null,
    wp_post_title: null,
    wp_post_status: null,
    url: input.url,
    change_date: input.changeDate,
    summary: input.summary,
    memo: input.memo,
    created_at: now,
    updated_at: now,
  };

  await runNamedQuery<Record<string, never>>("insert_internal_link_event", {
    id: event.id,
    wp_post_id: event.wp_post_id,
    url: event.url,
    change_date: event.change_date,
    summary: event.summary,
    memo: event.memo,
    created_at: event.created_at,
    updated_at: event.updated_at,
  });

  return event;
}
