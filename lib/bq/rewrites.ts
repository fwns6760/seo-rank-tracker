import { runNamedQuery } from "@/lib/bq/query-runner";
import {
  getWordPressPostById,
  getWordPressPostByUrl,
} from "@/lib/bq/wordpress";
import type {
  RewriteComparisonRow,
  RewriteOpportunityRow,
  RewriteRecordRow,
} from "@/lib/bq/types";
import {
  RewriteValidationError,
  type RewriteInput,
} from "@/lib/validators/rewrites";

function normalizeNullableWpPostId(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(value);

  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

/**
 * Returns rewrite history rows for one URL or a filtered URL search.
 */
export async function getRewriteHistory({
  startDate,
  endDate,
  wpPostId,
  url,
  urlSearch,
  pillarSearch,
  clusterSearch,
  limit = 24,
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
  return runNamedQuery<RewriteRecordRow>("rewrite_history", {
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
 * Returns before/after KPI comparison windows around each rewrite date.
 */
export async function getRewriteBeforeAfterComparison({
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
  return runNamedQuery<RewriteComparisonRow>("rewrite_before_after_comparison", {
    start_date: startDate,
    end_date: endDate,
    wp_post_id: wpPostId ?? null,
    url: url?.trim() ? url.trim() : null,
    url_search: urlSearch?.trim() ? urlSearch.trim() : null,
    pillar_search: pillarSearch?.trim() ? pillarSearch.trim() : null,
    cluster_search: clusterSearch?.trim() ? clusterSearch.trim() : null,
    window_days: Math.max(1, windowDays),
    limit,
  });
}

/**
 * Returns URLs that look like rewrite candidates from recent ranking data.
 */
export async function getRewriteOpportunityCandidates({
  startDate,
  endDate,
  urlSearch,
  pillarSearch,
  clusterSearch,
  limit = 8,
  minimumImpressions = 500,
  minimumPosition = 6,
  maximumPosition = 20,
  maximumCtr = 0.03,
  cooldownDays = 30,
}: {
  startDate: string;
  endDate: string;
  urlSearch?: string | null;
  pillarSearch?: string | null;
  clusterSearch?: string | null;
  limit?: number;
  minimumImpressions?: number;
  minimumPosition?: number;
  maximumPosition?: number;
  maximumCtr?: number;
  cooldownDays?: number;
}) {
  return runNamedQuery<RewriteOpportunityRow>("rewrite_opportunity_candidates", {
    start_date: startDate,
    end_date: endDate,
    url_search: urlSearch?.trim() ? urlSearch.trim() : null,
    pillar_search: pillarSearch?.trim() ? pillarSearch.trim() : null,
    cluster_search: clusterSearch?.trim() ? clusterSearch.trim() : null,
    limit,
    minimum_impressions: minimumImpressions,
    minimum_position: minimumPosition,
    maximum_position: maximumPosition,
    maximum_ctr: maximumCtr,
    cooldown_days: cooldownDays,
  });
}

/**
 * Inserts one rewrite record into BigQuery and returns the created row.
 */
export async function createRewriteRecord(input: RewriteInput) {
  const now = new Date().toISOString();
  const linkedPost = input.wpPostId
    ? await getWordPressPostById(input.wpPostId)
    : await getWordPressPostByUrl(input.url);

  if (input.wpPostId && !linkedPost) {
    throw new RewriteValidationError("Selected WordPress post was not found");
  }

  const rewrite: RewriteRecordRow = {
    id: `rewrite-${crypto.randomUUID()}`,
    wp_post_id:
      input.wpPostId ?? normalizeNullableWpPostId(linkedPost?.wp_post_id),
    wp_post_url: linkedPost?.url ?? null,
    wp_post_slug: linkedPost?.slug ?? null,
    wp_post_title: linkedPost?.title ?? null,
    wp_post_status: linkedPost?.post_status ?? null,
    url: input.wpPostId ? linkedPost?.url ?? input.url : input.url,
    rewrite_date: input.rewriteDate,
    rewrite_type: input.rewriteType,
    summary: input.summary,
    memo: input.memo,
    created_at: now,
    updated_at: now,
  };

  await runNamedQuery<Record<string, never>>("insert_rewrite", {
    id: rewrite.id,
    wp_post_id: rewrite.wp_post_id,
    url: rewrite.url,
    rewrite_date: rewrite.rewrite_date,
    rewrite_type: rewrite.rewrite_type,
    summary: rewrite.summary,
    memo: rewrite.memo,
    created_at: rewrite.created_at,
    updated_at: rewrite.updated_at,
  });

  return rewrite;
}
