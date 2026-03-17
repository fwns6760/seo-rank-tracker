import type { InternalLinkEventComparisonRow } from "@/lib/bq";
import {
  formatMetricNumber,
  formatPercent,
  formatPosition,
  formatSignedMetric,
  formatSignedPercentPoint,
  getImpactEvaluationBadgeTone,
  getImpactEvaluationCardTone,
  getImpactEvaluationLabelText,
} from "@/lib/impact-evaluation";
import { cn } from "@/lib/utils";

type InternalLinkImpactListProps = {
  rows: InternalLinkEventComparisonRow[];
  windowDays: number;
  title?: string;
  emptyMessage?: string;
  warning?: string | null;
};

export function InternalLinkImpactList({
  rows,
  windowDays,
  title = "内部リンク施策の前後比較",
  emptyMessage = "前後比較できる内部リンク施策はまだありません。",
  warning,
}: InternalLinkImpactListProps) {
  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {windowDays}d before / {windowDays}d after
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {warning ? (
          <p className="text-sm text-muted-foreground">
            internal_link_events 比較データはまだ利用できません: {warning}
          </p>
        ) : rows.length > 0 ? (
          rows.map((row) => (
            <div
              key={row.id}
              className={cn(
                "rounded-2xl border p-4",
                getImpactEvaluationCardTone(row.evaluation_label),
              )}
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{row.change_date}</p>
                  {row.wp_post_title ? (
                    <p className="text-sm text-muted-foreground">{row.wp_post_title}</p>
                  ) : null}
                  <p className="break-all text-sm text-muted-foreground">{row.url}</p>
                </div>
                <div className="space-y-2 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-medium",
                        getImpactEvaluationBadgeTone(row.evaluation_label),
                      )}
                    >
                      {getImpactEvaluationLabelText(row.evaluation_label)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Score: {formatMetricNumber(row.evaluation_score)}
                    {row.wp_post_id ? ` / Post ID: ${String(row.wp_post_id)}` : ""}
                  </p>
                </div>
              </div>
              {row.wp_post_url && row.wp_post_url !== row.url ? (
                <p className="mt-2 break-all text-xs text-muted-foreground">
                  Current URL: {row.wp_post_url}
                </p>
              ) : null}
              {row.summary ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {row.summary}
                </p>
              ) : null}
              <div className="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                <p>
                  Pos: {formatPosition(row.before_average_position)} →{" "}
                  {formatPosition(row.after_average_position)} (
                  {formatSignedMetric(row.position_delta, 2)})
                </p>
                <p>
                  Clicks: {formatMetricNumber(row.before_clicks)} →{" "}
                  {formatMetricNumber(row.after_clicks)} (
                  {formatSignedMetric(row.clicks_delta)})
                </p>
                <p>
                  Impr: {formatMetricNumber(row.before_impressions)} →{" "}
                  {formatMetricNumber(row.after_impressions)} (
                  {formatSignedMetric(row.impressions_delta)})
                </p>
                <p>
                  CTR: {formatPercent(row.before_ctr)} → {formatPercent(row.after_ctr)} (
                  {formatSignedPercentPoint(row.ctr_delta)})
                </p>
              </div>
              <div className="mt-3 grid gap-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-4">
                <p>
                  Inbound: {formatMetricNumber(row.before_incoming_links)} →{" "}
                  {formatMetricNumber(row.after_incoming_links)} (
                  {formatSignedMetric(row.incoming_links_delta)})
                </p>
                <p>
                  Outbound: {formatMetricNumber(row.before_outgoing_links)} →{" "}
                  {formatMetricNumber(row.after_outgoing_links)} (
                  {formatSignedMetric(row.outgoing_links_delta)})
                </p>
                <p>
                  Broken inbound: {formatMetricNumber(row.before_broken_incoming_links)} →{" "}
                  {formatMetricNumber(row.after_broken_incoming_links)}
                </p>
                <p>
                  Broken outbound: {formatMetricNumber(row.before_broken_outgoing_links)} →{" "}
                  {formatMetricNumber(row.after_broken_outgoing_links)}
                </p>
              </div>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                <p>
                  Data days: before {formatMetricNumber(row.before_days_with_data)} / after{" "}
                  {formatMetricNumber(row.after_days_with_data)}
                </p>
                <p>
                  Crawl: {row.before_crawl_date ?? "before missing"} →{" "}
                  {row.after_crawl_date ?? "after missing"}
                </p>
                <p>
                  Net link delta: {formatSignedMetric(row.total_link_delta)} / Broken delta:{" "}
                  {formatSignedMetric(row.broken_links_delta)}
                </p>
              </div>
              {row.evaluation_notes?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {row.evaluation_notes.map((note) => (
                    <span
                      key={`${row.id}:${note}`}
                      className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-muted-foreground"
                    >
                      {note}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
