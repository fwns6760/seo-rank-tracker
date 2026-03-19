import { runNamedQuery } from "@/lib/bq/query-runner";
import type { AlertFeedRow } from "@/lib/bq/types";
import { getOperationalSettings } from "@/lib/bq/settings";
import {
  getTrailingJstDateRange,
  shiftJstDateString,
} from "@/lib/time/jst";

type NullableFilter = string | null | undefined;

export type AlertFeedResult = {
  alerts: AlertFeedRow[];
  counts: {
    rankDrop: number;
    rankRise: number;
    indexAnomaly: number;
  };
  thresholds: {
    drop: number;
    rise: number;
  };
};

function normalizeNullableFilter(value: NullableFilter) {
  return value && value.length > 0 ? value : "";
}

function coerceNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

function getAlertPriorityScore(alert: AlertFeedRow) {
  if (alert.alert_type === "index_anomaly") {
    return 3;
  }

  if (alert.alert_type === "rank_drop") {
    return 2;
  }

  return 1;
}

function compareAlerts(left: AlertFeedRow, right: AlertFeedRow) {
  const priorityDiff = getAlertPriorityScore(right) - getAlertPriorityScore(left);

  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  const leftScore = coerceNumber(left.alert_score) ?? 0;
  const rightScore = coerceNumber(right.alert_score) ?? 0;

  if (rightScore !== leftScore) {
    return rightScore - leftScore;
  }

  return left.keyword.localeCompare(right.keyword, "ja-JP");
}

/**
 * Loads threshold-aware alert candidates for dashboard display and Slack delivery.
 */
export async function getAlertFeed({
  keyword,
  url,
  limit = 8,
}: {
  keyword?: NullableFilter;
  url?: NullableFilter;
  limit?: number;
} = {}): Promise<AlertFeedResult> {
  const settings = await getOperationalSettings();
  const movementRange = getTrailingJstDateRange(7);
  const recentRange = getTrailingJstDateRange(3);
  const baselineEndDate = shiftJstDateString(recentRange.startDate, -1);
  const baselineStartDate = shiftJstDateString(baselineEndDate, -29);
  const normalizedKeyword = normalizeNullableFilter(keyword);
  const normalizedUrl = normalizeNullableFilter(url);

  const [rankMovementAlerts, indexAnomalies] = await Promise.all([
    runNamedQuery<AlertFeedRow>("alert_rank_movements", {
      start_date: movementRange.startDate,
      end_date: movementRange.endDate,
      keyword: normalizedKeyword,
      url: normalizedUrl,
      drop_threshold: settings.values.alertDropThreshold,
      rise_threshold: settings.values.alertRiseThreshold,
      limit,
    }),
    runNamedQuery<AlertFeedRow>("alert_index_anomalies", {
      recent_start_date: recentRange.startDate,
      recent_end_date: recentRange.endDate,
      baseline_start_date: baselineStartDate,
      baseline_end_date: baselineEndDate,
      keyword: normalizedKeyword,
      url: normalizedUrl,
      limit,
    }),
  ]);

  const alerts = [...rankMovementAlerts, ...indexAnomalies]
    .sort(compareAlerts)
    .slice(0, limit);

  return {
    alerts,
    counts: {
      rankDrop: rankMovementAlerts.filter((alert) => alert.alert_type === "rank_drop")
        .length,
      rankRise: rankMovementAlerts.filter((alert) => alert.alert_type === "rank_rise")
        .length,
      indexAnomaly: indexAnomalies.length,
    },
    thresholds: {
      drop: settings.values.alertDropThreshold,
      rise: settings.values.alertRiseThreshold,
    },
  };
}
