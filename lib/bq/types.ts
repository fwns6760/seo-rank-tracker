export type QueryParamValue =
  | string
  | number
  | boolean
  | Date
  | null
  | string[]
  | number[]
  | boolean[];

export type QueryParams = Record<string, QueryParamValue>;

export type AlertFeedRow = {
  alert_type: string;
  alert_severity: string;
  keyword: string;
  url: string;
  priority: string | null;
  latest_date: string | null;
  latest_position: number | null;
  previous_position: number | null;
  latest_clicks: number | string | null;
  latest_impressions: number | string | null;
  position_delta: number | null;
  baseline_impressions: number | string | null;
  days_since_seen: number | string | null;
  alert_score: number | null;
};

export type DashboardKpiSummaryRow = {
  tracked_keywords: number | string;
  average_position: number | null;
  improved_keywords: number | string;
  declined_keywords: number | string;
};

export type RankTrendRow = {
  date: string;
  keyword: string;
  url: string;
  average_position: number | null;
  average_scrape_position: number | null;
  impressions: number | string | null;
  clicks: number | string | null;
};

export type DashboardTrendRow = {
  date: string;
  average_position: number | null;
  tracked_keywords: number | string;
  improved_keywords: number | string;
  declined_keywords: number | string;
};

export type ClusterOverviewRow = {
  pillar: string | null;
  cluster: string;
  intents: string[] | null;
  tracked_keywords: number | string;
  target_pages: number | string;
  total_clicks: number | string | null;
  total_impressions: number | string | null;
  ctr: number | null;
  average_position: number | null;
  latest_date: string | null;
  rewrite_count: number | string;
  orphan_pages: number | string;
  broken_pages: number | string;
  issue_pages: number | string;
  latest_crawl_date: string | null;
  primary_url: string | null;
  primary_keyword: string | null;
  primary_keyword_url: string | null;
};

export type PageKpiRow = {
  url: string;
  clicks: number | string | null;
  impressions: number | string | null;
  ctr: number | null;
  average_position: number | null;
};

export type PageCandidateRow = {
  url: string;
  clicks: number | string | null;
  impressions: number | string | null;
  ctr: number | null;
  average_position: number | null;
  related_keywords: number | string;
};

export type PageSummaryRow = {
  url: string;
  total_clicks: number | string | null;
  total_impressions: number | string | null;
  ctr: number | null;
  average_position: number | null;
  average_scrape_position: number | null;
  related_keywords: number | string;
  latest_date: string | null;
};

export type PageRelatedKeywordRow = {
  keyword: string;
  clicks: number | string | null;
  impressions: number | string | null;
  ctr: number | null;
  average_position: number | null;
  average_scrape_position: number | null;
};

export type PageRewriteHistoryRow = {
  url: string;
  wp_post_id: number | string | null;
  wp_post_url: string | null;
  wp_post_slug: string | null;
  wp_post_title: string | null;
  wp_post_status: string | null;
  rewrite_date: string;
  rewrite_type: string;
  summary: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type PageInternalLinkSummaryRow = {
  latest_crawl_date: string | null;
  outgoing_links: number | string;
  incoming_links: number | string;
  broken_outgoing_links: number | string;
  broken_incoming_links: number | string;
};

export type DashboardAlertRow = {
  url: string;
  keyword: string;
  latest_date: string;
  latest_position: number | null;
  previous_position: number | null;
  latest_clicks: number | string | null;
  latest_impressions: number | string | null;
  position_delta: number | null;
};

export type KeywordCandidateRow = {
  keyword: string;
  primary_url: string | null;
  impressions: number | string | null;
  average_position: number | null;
  latest_date: string | null;
};

export type KeywordSummaryRow = {
  keyword: string;
  primary_url: string | null;
  tracked_urls: number | string;
  total_clicks: number | string | null;
  total_impressions: number | string | null;
  latest_average_position: number | null;
  latest_average_scrape_position: number | null;
};

export type KeywordTrendRow = {
  date: string;
  average_position: number | null;
  average_scrape_position: number | null;
  clicks: number | string | null;
  impressions: number | string | null;
};

export type KeywordTargetUrlRow = {
  url: string;
  clicks: number | string | null;
  impressions: number | string | null;
  ctr: number | null;
  average_position: number | null;
  average_scrape_position: number | null;
};

export type KeywordRewriteMarkerRow = {
  rewrite_date: string;
  url: string;
  rewrite_type: string;
  summary: string | null;
  memo: string | null;
};

export type RewriteRecordRow = {
  id: string;
  wp_post_id: number | string | null;
  wp_post_url: string | null;
  wp_post_slug: string | null;
  wp_post_title: string | null;
  wp_post_status: string | null;
  url: string;
  rewrite_date: string;
  rewrite_type: string;
  summary: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type ImpactEvaluationLabel =
  | "positive"
  | "negative"
  | "mixed"
  | "needs_review"
  | "insufficient_data";

export type RewriteComparisonRow = {
  id: string;
  wp_post_id: number | string | null;
  wp_post_url: string | null;
  wp_post_slug: string | null;
  wp_post_title: string | null;
  wp_post_status: string | null;
  url: string;
  rewrite_date: string;
  rewrite_type: string;
  summary: string | null;
  before_average_position: number | null;
  after_average_position: number | null;
  before_clicks: number | string | null;
  after_clicks: number | string | null;
  before_impressions: number | string | null;
  after_impressions: number | string | null;
  before_ctr: number | null;
  after_ctr: number | null;
  before_days_with_data: number | string;
  after_days_with_data: number | string;
  position_delta: number | null;
  clicks_delta: number | string | null;
  impressions_delta: number | string | null;
  ctr_delta: number | null;
  evaluation_score: number | string;
  evaluation_label: ImpactEvaluationLabel;
  evaluation_notes: string[] | null;
};

export type RewriteOpportunityRow = {
  wp_post_id: number | string | null;
  wp_post_title: string | null;
  url: string;
  total_clicks: number | string | null;
  total_impressions: number | string | null;
  ctr: number | null;
  average_position: number | null;
  tracked_keywords: number | string;
  latest_date: string | null;
  latest_rewrite_date: string | null;
  days_since_last_rewrite: number | string | null;
};

export type InternalLinkEventRow = {
  id: string;
  wp_post_id: number | string | null;
  wp_post_url: string | null;
  wp_post_slug: string | null;
  wp_post_title: string | null;
  wp_post_status: string | null;
  url: string;
  change_date: string;
  summary: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
};

export type InternalLinkEventComparisonRow = {
  id: string;
  wp_post_id: number | string | null;
  wp_post_url: string | null;
  wp_post_slug: string | null;
  wp_post_title: string | null;
  wp_post_status: string | null;
  url: string;
  change_date: string;
  summary: string | null;
  before_average_position: number | null;
  after_average_position: number | null;
  before_clicks: number | string | null;
  after_clicks: number | string | null;
  before_impressions: number | string | null;
  after_impressions: number | string | null;
  before_ctr: number | null;
  after_ctr: number | null;
  before_days_with_data: number | string;
  after_days_with_data: number | string;
  before_crawl_date: string | null;
  after_crawl_date: string | null;
  before_incoming_links: number | string;
  after_incoming_links: number | string;
  before_outgoing_links: number | string;
  after_outgoing_links: number | string;
  before_broken_incoming_links: number | string;
  after_broken_incoming_links: number | string;
  before_broken_outgoing_links: number | string;
  after_broken_outgoing_links: number | string;
  position_delta: number | null;
  clicks_delta: number | string | null;
  impressions_delta: number | string | null;
  ctr_delta: number | null;
  incoming_links_delta: number | string;
  outgoing_links_delta: number | string;
  total_link_delta: number | string;
  broken_links_delta: number | string;
  evaluation_score: number | string;
  evaluation_label: ImpactEvaluationLabel;
  evaluation_notes: string[] | null;
};

export type LinkRow = {
  crawl_date: string;
  source_url: string;
  target_url: string;
  anchor_text: string | null;
  status_code: number | null;
};

export type LinksSummaryRow = {
  latest_crawl_date: string | null;
  total_links: number | string;
  broken_links: number | string;
  source_pages: number | string;
  target_pages: number | string;
  orphan_pages: number | string;
};

export type OrphanPageRow = {
  url: string;
  total_clicks: number | string | null;
  total_impressions: number | string | null;
  average_position: number | null;
  latest_date: string | null;
  incoming_links: number | string;
};

export type TrackedKeywordRow = {
  keyword: string;
  target_url: string;
  category: string | null;
  pillar: string | null;
  cluster: string | null;
  intent: string | null;
  priority: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AppSettingRow = {
  setting_key: string;
  setting_value: string | null;
  created_at: string;
  updated_at: string;
};

export type WordPressPostRow = {
  wp_post_id: number | string;
  url: string;
  slug: string;
  title: string | null;
  post_type: string;
  post_status: string;
  published_at: string | null;
  modified_at: string | null;
  categories: string[] | null;
  tags: string[] | null;
  content_hash: string | null;
  word_count: number | string | null;
  fetched_at: string;
  execution_id: string;
};
