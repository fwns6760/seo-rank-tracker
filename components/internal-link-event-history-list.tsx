import type { InternalLinkEventRow } from "@/lib/bq";

type InternalLinkEventHistoryListProps = {
  rows: InternalLinkEventRow[];
  title: string;
  emptyMessage: string;
  warning?: string | null;
};

export function InternalLinkEventHistoryList({
  rows,
  title,
  emptyMessage,
  warning,
}: InternalLinkEventHistoryListProps) {
  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
          latest first
        </p>
      </div>
      <div className="mt-4 space-y-3">
        {warning ? (
          <p className="text-sm text-muted-foreground">
            internal_link_events データはまだ利用できません: {warning}
          </p>
        ) : rows.length > 0 ? (
          rows.map((row) => (
            <div
              key={row.id}
              className="rounded-2xl border border-border/70 bg-background/70 p-4"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{row.change_date}</p>
                  {row.wp_post_title ? (
                    <p className="text-sm text-muted-foreground">{row.wp_post_title}</p>
                  ) : null}
                  <p className="break-all text-sm text-muted-foreground">{row.url}</p>
                </div>
                {row.wp_post_id ? (
                  <p className="text-xs text-muted-foreground">
                    Post ID: {String(row.wp_post_id)}
                  </p>
                ) : null}
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
              {row.memo ? (
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {row.memo}
                </p>
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
