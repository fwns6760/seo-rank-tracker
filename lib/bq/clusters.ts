import { runNamedQuery } from "@/lib/bq/query-runner";
import type { ClusterOverviewRow } from "@/lib/bq/types";

/**
 * Returns cluster-level SEO aggregates for the selected window.
 */
export async function getClusterOverview({
  startDate,
  endDate,
  pillarSearch,
  clusterSearch,
  intentFilter,
  limit = 40,
}: {
  startDate: string;
  endDate: string;
  pillarSearch?: string | null;
  clusterSearch?: string | null;
  intentFilter?: string | null;
  limit?: number;
}) {
  return runNamedQuery<ClusterOverviewRow>("cluster_overview", {
    start_date: startDate,
    end_date: endDate,
    pillar_search: pillarSearch?.trim() ? pillarSearch.trim() : null,
    cluster_search: clusterSearch?.trim() ? clusterSearch.trim() : null,
    intent_filter: intentFilter?.trim() ? intentFilter.trim() : null,
    limit,
  });
}
