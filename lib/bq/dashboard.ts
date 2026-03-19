import { runNamedQuery } from "@/lib/bq/query-runner";
import type {
  DashboardAlertRow,
  DashboardKpiSummaryRow,
  DashboardTrendRow,
  PageKpiRow,
  RankTrendRow,
} from "@/lib/bq/types";
import { getTrailingJstDateRange } from "@/lib/time/jst";

type DateRangeInput = {
  startDate: string;
  endDate: string;
};

type RankTrendInput = DateRangeInput & {
  keyword?: string | null;
  url?: string | null;
};

type PageKpiInput = DateRangeInput & {
  url?: string | null;
};

type DashboardWindowInput = DateRangeInput & {
  keyword?: string | null;
  url?: string | null;
};

function normalizeNullableFilter(value?: string | null) {
  return value && value.length > 0 ? value : "";
}

function getDefaultDateRange(windowDays = 30) {
  return getTrailingJstDateRange(windowDays);
}

/**
 * Returns the top-level dashboard KPI summary for the selected JST window.
 */
export async function getDashboardKpiSummary(windowDays = 30) {
  const { startDate, endDate } = getDefaultDateRange(windowDays);
  const rows = await runNamedQuery<DashboardKpiSummaryRow>(
    "dashboard_kpi_summary",
    {
      start_date: startDate,
      end_date: endDate,
      keyword: "",
      url: "",
    },
  );

  return rows[0] ?? null;
}

/**
 * Returns dashboard KPI summary for a filtered JST date window.
 */
export async function getFilteredDashboardKpiSummary({
  startDate,
  endDate,
  keyword,
  url,
}: DashboardWindowInput) {
  const rows = await runNamedQuery<DashboardKpiSummaryRow>(
    "dashboard_kpi_summary",
    {
      start_date: startDate,
      end_date: endDate,
      keyword: normalizeNullableFilter(keyword),
      url: normalizeNullableFilter(url),
    },
  );

  return rows[0] ?? null;
}

/**
 * Returns daily ranking trend rows for dashboard and keyword detail charts.
 */
export async function getRankTrend({
  startDate,
  endDate,
  keyword,
  url,
}: RankTrendInput) {
  return runNamedQuery<RankTrendRow>("rank_trend_by_date_range", {
    start_date: startDate,
    end_date: endDate,
    keyword: normalizeNullableFilter(keyword),
    url: normalizeNullableFilter(url),
  });
}

/**
 * Returns dashboard daily trend points aggregated by date.
 */
export async function getDashboardTrend({
  startDate,
  endDate,
  keyword,
  url,
}: DashboardWindowInput) {
  return runNamedQuery<DashboardTrendRow>("dashboard_daily_trend", {
    start_date: startDate,
    end_date: endDate,
    keyword: normalizeNullableFilter(keyword),
    url: normalizeNullableFilter(url),
  });
}

/**
 * Returns page-level KPI rows within a required partition-filtered date range.
 */
export async function getPageKpis({ startDate, endDate, url }: PageKpiInput) {
  return runNamedQuery<PageKpiRow>("page_kpi_by_url", {
    start_date: startDate,
    end_date: endDate,
    url: normalizeNullableFilter(url),
  });
}

/**
 * Returns recent large ranking movements for dashboard alert panels.
 */
export async function getDashboardAlertCandidates({
  startDate,
  endDate,
  keyword,
  url,
  limit = 6,
}: DashboardWindowInput & { limit?: number }) {
  return runNamedQuery<DashboardAlertRow>("dashboard_alert_candidates", {
    start_date: startDate,
    end_date: endDate,
    keyword: normalizeNullableFilter(keyword),
    url: normalizeNullableFilter(url),
    limit,
  });
}

/**
 * Returns a compact page leaderboard for the dashboard.
 */
export async function getDashboardImportantPages({
  startDate,
  endDate,
  keyword,
  url,
  limit = 6,
}: DashboardWindowInput & { limit?: number }) {
  return runNamedQuery<PageKpiRow>("dashboard_important_pages", {
    start_date: startDate,
    end_date: endDate,
    keyword: normalizeNullableFilter(keyword),
    url: normalizeNullableFilter(url),
    limit,
  });
}
