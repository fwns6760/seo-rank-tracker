import type { AlertFeedRow } from "@/lib/bq/types";

type SlackBlock = {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
};

export type SlackWebhookPayload = {
  text: string;
  blocks: SlackBlock[];
};

function coerceNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  const numeric = typeof value === "number" ? value : Number(value);

  return Number.isFinite(numeric) ? numeric : null;
}

function formatMetric(value: number | string | null | undefined, digits = 0) {
  const numeric = coerceNumber(value);

  if (numeric === null) {
    return "--";
  }

  return numeric.toLocaleString("ja-JP", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatAlertLine(alert: AlertFeedRow) {
  if (alert.alert_type === "index_anomaly") {
    return [
      "INDEX",
      alert.keyword,
      `last_seen=${alert.latest_date ?? "--"}`,
      `baseline_impr=${formatMetric(alert.baseline_impressions)}`,
      `days_missing=${formatMetric(alert.days_since_seen)}`,
    ].join(" | ");
  }

  const delta = coerceNumber(alert.position_delta);

  return [
    alert.alert_type === "rank_drop" ? "DROP" : "RISE",
    alert.keyword,
    `latest=${formatMetric(alert.latest_position, 2)}`,
    `prev=${formatMetric(alert.previous_position, 2)}`,
    `delta=${delta === null ? "--" : `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`}`,
    `impr=${formatMetric(alert.latest_impressions)}`,
  ].join(" | ");
}

/**
 * Builds a compact Slack webhook payload for the current alert batch.
 */
export function buildSlackAlertPayload({
  executionId,
  targetSite,
  alerts,
  counts,
}: {
  executionId: string;
  targetSite: string;
  alerts: AlertFeedRow[];
  counts: {
    rankDrop: number;
    rankRise: number;
    indexAnomaly: number;
  };
}): SlackWebhookPayload {
  const headline = `SEO alerts detected for ${targetSite}`;
  const summary = [
    `drop=${counts.rankDrop}`,
    `rise=${counts.rankRise}`,
    `index=${counts.indexAnomaly}`,
  ].join(" / ");
  const previewLines = alerts.slice(0, 6).map((alert) => `• ${formatAlertLine(alert)}`);

  return {
    text: [headline, `execution_id=${executionId}`, summary, ...previewLines].join("\n"),
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${headline}*\n${summary}`,
        },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*execution_id*\n\`${executionId}\``,
          },
          {
            type: "mrkdwn",
            text: `*alert_count*\n${alerts.length.toLocaleString("ja-JP")}`,
          },
        ],
      },
      ...alerts.slice(0, 6).map((alert) => ({
        type: "section",
        text: {
          type: "mrkdwn",
          text: formatAlertLine(alert),
        },
      })),
    ],
  };
}

/**
 * Sends one Slack webhook payload and throws when delivery fails.
 */
export async function postSlackWebhook(
  webhookUrl: string,
  payload: SlackWebhookPayload,
) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `Slack webhook failed with status ${response.status}: ${body || response.statusText}`,
    );
  }
}
