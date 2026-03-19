import { NextResponse } from "next/server";

import { getOperationalSettings } from "@/lib/bq";
import { buildSlackAlertPayload, postSlackWebhook } from "@/lib/alerts/slack";
import { getAlertFeed } from "@/lib/alerts/service";
import { getServerEnv } from "@/lib/env";
import { createJobLogger } from "@/lib/logging";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getTargetSite() {
  return process.env.TARGET_SITE_HOST?.trim() || "unknown";
}

export async function POST() {
  const logger = createJobLogger({
    jobName: "dispatch_alerts",
    targetSite: getTargetSite(),
  });

  logger.logExecution({
    status: "started",
    message: "Alert dispatch started",
  });

  try {
    getServerEnv();
    logger.logStep({
      step: "load_alert_feed",
      stepStatus: "started",
      message: "Loading threshold-aware alert candidates",
    });
    const [settings, alertFeed] = await Promise.all([
      getOperationalSettings(),
      getAlertFeed({
        limit: 8,
      }),
    ]);
    logger.logStep({
      step: "load_alert_feed",
      stepStatus: "success",
      message: "Alert candidates loaded",
      outputSummary: {
        alert_count: alertFeed.alerts.length,
        counts: alertFeed.counts,
        thresholds: alertFeed.thresholds,
      },
    });

    if (!settings.values.slackWebhookUrl) {
      logger.logStep({
        step: "send_slack_notification",
        stepStatus: "skipped",
        message: "Slack webhook is not configured",
      });
      logger.logExecution({
        status: "completed",
        message: "Alert dispatch skipped because Slack webhook is not configured",
        fetched_rows: alertFeed.alerts.length,
        skipped_rows: 1,
        extra: {
          output_summary: {
            counts: alertFeed.counts,
          },
        },
      });

      return NextResponse.json(
        {
          executionId: logger.executionId,
          sent: false,
          skippedReason: "slack_webhook_not_configured",
          alertCount: alertFeed.alerts.length,
          counts: alertFeed.counts,
        },
        {
          status: 202,
        },
      );
    }

    if (alertFeed.alerts.length === 0) {
      logger.logStep({
        step: "send_slack_notification",
        stepStatus: "skipped",
        message: "No alert candidates matched the current thresholds",
      });
      logger.logExecution({
        status: "completed",
        message: "Alert dispatch finished with no alert candidates",
        extra: {
          output_summary: {
            counts: alertFeed.counts,
          },
        },
      });

      return NextResponse.json({
        executionId: logger.executionId,
        sent: false,
        skippedReason: "no_alert_candidates",
        alertCount: 0,
        counts: alertFeed.counts,
      });
    }

    const payload = buildSlackAlertPayload({
      executionId: logger.executionId,
      targetSite: settings.values.targetSiteHost,
      alerts: alertFeed.alerts,
      counts: alertFeed.counts,
    });

    logger.logStep({
      step: "send_slack_notification",
      stepStatus: "started",
      message: "Sending alert notification to Slack",
      inputSummary: {
        alert_count: alertFeed.alerts.length,
        counts: alertFeed.counts,
      },
    });
    await postSlackWebhook(settings.values.slackWebhookUrl, payload);
    logger.logStep({
      step: "send_slack_notification",
      stepStatus: "success",
      message: "Slack notification sent",
      outputSummary: {
        alert_count: alertFeed.alerts.length,
        counts: alertFeed.counts,
      },
    });

    logger.logExecution({
      status: "completed",
      message: "Alert dispatch completed",
      fetched_rows: alertFeed.alerts.length,
      inserted_rows: 1,
      extra: {
        output_summary: {
          counts: alertFeed.counts,
          thresholds: alertFeed.thresholds,
        },
      },
    });

    return NextResponse.json({
      executionId: logger.executionId,
      sent: true,
      alertCount: alertFeed.alerts.length,
      counts: alertFeed.counts,
    });
  } catch (error) {
    logger.logError(error, {
      message: "Alert dispatch failed",
      failedStep: "dispatch_alerts",
      recoverable: false,
      error_count: 1,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Alert dispatch failed",
        executionId: logger.executionId,
      },
      {
        status: 500,
      },
    );
  }
}
