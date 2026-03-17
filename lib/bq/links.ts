import { runNamedQuery } from "@/lib/bq/query-runner";
import type {
  LinkRow,
  LinksSummaryRow,
  OrphanPageRow,
} from "@/lib/bq/types";

/**
 * Returns summary metrics from the latest internal-links crawl in the selected window.
 */
export async function getLinksLatestSummary({
  startDate,
  endDate,
  urlSearch,
  pillarSearch,
  clusterSearch,
}: {
  startDate: string;
  endDate: string;
  urlSearch?: string | null;
  pillarSearch?: string | null;
  clusterSearch?: string | null;
}) {
  const rows = await runNamedQuery<LinksSummaryRow>("links_latest_summary", {
    start_date: startDate,
    end_date: endDate,
    url_search: urlSearch?.trim() ? urlSearch.trim() : null,
    pillar_search: pillarSearch?.trim() ? pillarSearch.trim() : null,
    cluster_search: clusterSearch?.trim() ? clusterSearch.trim() : null,
  });

  return rows[0] ?? null;
}

/**
 * Returns latest internal-link rows with optional source / target filters.
 */
export async function getLatestLinks({
  startDate,
  endDate,
  sourceSearch,
  targetSearch,
  pillarSearch,
  clusterSearch,
  limit = 40,
}: {
  startDate: string;
  endDate: string;
  sourceSearch?: string | null;
  targetSearch?: string | null;
  pillarSearch?: string | null;
  clusterSearch?: string | null;
  limit?: number;
}) {
  return runNamedQuery<LinkRow>("links_latest_rows", {
    start_date: startDate,
    end_date: endDate,
    source_search: sourceSearch?.trim() ? sourceSearch.trim() : null,
    target_search: targetSearch?.trim() ? targetSearch.trim() : null,
    pillar_search: pillarSearch?.trim() ? pillarSearch.trim() : null,
    cluster_search: clusterSearch?.trim() ? clusterSearch.trim() : null,
    limit,
  });
}

/**
 * Returns latest 404 internal links for the selected window.
 */
export async function getBrokenLinks404({
  startDate,
  endDate,
  sourceSearch,
  targetSearch,
  pillarSearch,
  clusterSearch,
  limit = 20,
}: {
  startDate: string;
  endDate: string;
  sourceSearch?: string | null;
  targetSearch?: string | null;
  pillarSearch?: string | null;
  clusterSearch?: string | null;
  limit?: number;
}) {
  return runNamedQuery<LinkRow>("links_broken_404", {
    start_date: startDate,
    end_date: endDate,
    source_search: sourceSearch?.trim() ? sourceSearch.trim() : null,
    target_search: targetSearch?.trim() ? targetSearch.trim() : null,
    pillar_search: pillarSearch?.trim() ? pillarSearch.trim() : null,
    cluster_search: clusterSearch?.trim() ? clusterSearch.trim() : null,
    limit,
  });
}

/**
 * Returns tracked URLs with zero inbound internal links on the latest crawl.
 */
export async function getOrphanPages({
  startDate,
  endDate,
  urlSearch,
  pillarSearch,
  clusterSearch,
  limit = 20,
}: {
  startDate: string;
  endDate: string;
  urlSearch?: string | null;
  pillarSearch?: string | null;
  clusterSearch?: string | null;
  limit?: number;
}) {
  return runNamedQuery<OrphanPageRow>("links_orphan_pages", {
    start_date: startDate,
    end_date: endDate,
    url_search: urlSearch?.trim() ? urlSearch.trim() : null,
    pillar_search: pillarSearch?.trim() ? pillarSearch.trim() : null,
    cluster_search: clusterSearch?.trim() ? clusterSearch.trim() : null,
    limit,
  });
}

/**
 * Returns tracked URLs with very low inbound-link counts on the latest crawl.
 */
export async function getLowInboundPages({
  startDate,
  endDate,
  urlSearch,
  pillarSearch,
  clusterSearch,
  limit = 20,
}: {
  startDate: string;
  endDate: string;
  urlSearch?: string | null;
  pillarSearch?: string | null;
  clusterSearch?: string | null;
  limit?: number;
}) {
  return runNamedQuery<OrphanPageRow>("links_low_inbound_pages", {
    start_date: startDate,
    end_date: endDate,
    url_search: urlSearch?.trim() ? urlSearch.trim() : null,
    pillar_search: pillarSearch?.trim() ? pillarSearch.trim() : null,
    cluster_search: clusterSearch?.trim() ? clusterSearch.trim() : null,
    limit,
  });
}
