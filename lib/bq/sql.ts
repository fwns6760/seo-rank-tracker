import { readFile } from "node:fs/promises";
import path from "node:path";

import { getServerEnv } from "@/lib/env";

export const sqlQueryNames = [
  "cluster_overview",
  "alert_index_anomalies",
  "alert_rank_movements",
  "app_settings_list",
  "dashboard_alert_candidates",
  "dashboard_daily_trend",
  "dashboard_important_pages",
  "dashboard_kpi_summary",
  "insert_rewrite",
  "insert_internal_link_event",
  "internal_link_event_before_after_comparison",
  "internal_link_event_history",
  "keyword_candidates",
  "keyword_daily_trend",
  "keyword_rewrite_markers",
  "keyword_summary",
  "keyword_target_urls",
  "links_broken_404",
  "links_low_inbound_pages",
  "links_latest_rows",
  "links_latest_summary",
  "links_orphan_pages",
  "page_candidates",
  "page_internal_link_summary",
  "page_kpi_by_url",
  "page_related_keywords",
  "page_rewrite_history",
  "page_summary",
  "rank_trend_by_date_range",
  "rewrite_before_after_comparison",
  "rewrite_history",
  "rewrite_opportunity_candidates",
  "tracked_keyword_list",
  "upsert_app_setting",
  "upsert_tracked_keyword",
  "upsert_wp_post",
  "wp_post_by_id",
  "wp_post_by_url",
  "wp_post_list",
] as const;

type SqlDirectory = "migrations" | "queries";

export type SqlQueryName = (typeof sqlQueryNames)[number];

const sqlCache = new Map<string, string>();

function interpolateSqlTemplate(sql: string) {
  const env = getServerEnv();

  return sql
    .replaceAll("${PROJECT_ID}", env.googleCloudProject)
    .replaceAll("${DATASET}", env.bigQueryDataset);
}

async function readSqlFile(directory: SqlDirectory, fileName: string) {
  const cacheKey = `${directory}/${fileName}`;

  if (sqlCache.has(cacheKey)) {
    return sqlCache.get(cacheKey)!;
  }

  const filePath = path.join(process.cwd(), "sql", directory, fileName);
  const sql = await readFile(filePath, "utf8");

  sqlCache.set(cacheKey, sql);

  return sql;
}

/**
 * Loads a reusable query template and injects project-specific placeholders.
 */
export async function loadQuerySql(name: SqlQueryName) {
  const sql = await readSqlFile("queries", `${name}.sql`);

  return interpolateSqlTemplate(sql);
}

/**
 * Loads a numbered migration file and injects project-specific placeholders.
 */
export async function loadMigrationSql(fileName: string) {
  const sql = await readSqlFile("migrations", fileName);

  return interpolateSqlTemplate(sql);
}
