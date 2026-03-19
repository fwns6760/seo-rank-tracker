# SEO Rank Tracker

`prosports.yoshilover.com` の記事を対象に、検索順位、表示回数、クリック数、CTR、
リライト履歴、内部リンク状況を継続監視するための運用アプリです。

## 現在の実装範囲

- Next.js App Router + TypeScript + Tailwind + shadcn/ui による運用画面
- BigQuery `daily_rankings`, `rewrites`, `internal_links`, `internal_link_events`, `tracked_keywords`, `app_settings`
- BigQuery `wp_posts` と `rewrites.wp_post_id` による記事単位のリライト追跡
- `rewrites` / `internal_link_events` の施策成果判定と `7日` / `14日` 比較窓
- Google Search Console 日次取得 Job
- `dashboard`, `keywords`, `pages`, `rewrites`, `links`, `settings` 画面
- `clusters` 画面による topic cluster 単位の集計
- 構造化 JSON ログと `execution_id` による実行追跡
- Slack 通知用 alert 判定と `/api/alerts/dispatch`

進捗チケットは [doc/00-ticket-index.md](./doc/00-ticket-index.md) を参照してください。

## セットアップ

前提:

- Node.js 20 以上
- npm
- Python 3.12 以上
- `gcloud` / `bq` CLI

ローカルセットアップ:

```bash
npm install
python3 -m venv .venv
. .venv/bin/activate
pip install \
  -r jobs/fetch_gsc/requirements.txt \
  -r jobs/crawl_internal_links/requirements.txt \
  -r jobs/sync_wordpress_posts/requirements.txt
cp .env.local.example .env.local
```

`.env.local` を編集して必須環境変数を埋めたら、開発サーバーを起動します。

```bash
npm run dev
```

品質チェック:

```bash
.venv/bin/python -m unittest discover -s tests -p 'test_*.py'
npm run build
npm run typecheck
npm run lint
```

## 必須環境変数

`.env.local.example` にある値のうち、実運用で最低限必要なのは次の項目です。

| 変数名 | 必須 | 用途 |
| --- | --- | --- |
| `NEXT_PUBLIC_APP_NAME` | 任意 | UI 上の表示名 |
| `GOOGLE_CLOUD_PROJECT` | 必須 | BigQuery / Cloud Run / Cloud Scheduler のプロジェクト ID |
| `BIGQUERY_DATASET` | 必須 | 監視データを保存する BigQuery dataset |
| `BIGQUERY_LOCATION` | 必須 | BigQuery location。既定は `asia-northeast1` |
| `GSC_PROPERTY_URI` | 必須 | 例: `https://prosports.yoshilover.com/` |
| `TARGET_SITE_HOST` | 必須 | 例: `prosports.yoshilover.com` |
| `GOOGLE_APPLICATION_CREDENTIALS` | 条件付き | ローカルで JSON キーファイルを使う場合のパス |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | 条件付き | Secret Manager 経由で JSON を環境変数注入する場合 |
| `INTERNAL_LINKS_START_URL` | 任意 | `crawl_internal_links` の開始 URL。未指定時は `https://${TARGET_SITE_HOST}/` |
| `INTERNAL_LINKS_USER_AGENT` | 任意 | `crawl_internal_links` の User-Agent override |
| `WORDPRESS_BASE_URL` | 条件付き | `sync_wordpress_posts` の接続先 URL。env 未指定時は `app_settings` を参照 |
| `WORDPRESS_AUTH_MODE` | 任意 | `none` または `basic`。未指定時は env / `app_settings` / 認証情報の有無から解決 |
| `WORDPRESS_POST_TYPE` | 任意 | 既定は `posts`。env 未指定時は `app_settings` を参照 |
| `WORDPRESS_POST_STATUSES` | 任意 | 既定は `publish`。カンマ区切り。env 未指定時は `app_settings` を参照 |
| `WORDPRESS_USERNAME` | 条件付き | `WORDPRESS_AUTH_MODE=basic` のとき必要。env 未指定時は `app_settings` を参照 |
| `WORDPRESS_APPLICATION_PASSWORD` | 条件付き | 実パスワード。Secret Manager から Job 実行時に注入する |
| `WORDPRESS_APPLICATION_PASSWORD_SECRET_NAME` | 任意 | Secret Manager 上の参照名。UI / 運用メモ用で、実パスワード自体は保存しない |
| `MANUAL_RUN_MODE` | 任意 | `local_process` または `cloud_run_job`。Cloud Run Service 上の dashboard manual run を Job 実行へ切り替える |
| `MANUAL_RUN_CLOUD_RUN_REGION` | 条件付き | `MANUAL_RUN_MODE=cloud_run_job` のとき必要。`fetch_gsc` Job の region |
| `MANUAL_RUN_FETCH_GSC_JOB_NAME` | 条件付き | `MANUAL_RUN_MODE=cloud_run_job` のとき必要。dashboard から起動する `fetch_gsc` Job 名 |

補足:

- `GOOGLE_APPLICATION_CREDENTIALS` と `GOOGLE_APPLICATION_CREDENTIALS_JSON` はどちらか片方で足ります。
- `settings` 画面で保存する `app_settings` は UI / alert 判定の設定保存先です。`fetch_gsc` と `crawl_internal_links` は現時点では env を実行設定として参照します。
- `sync_wordpress_posts` の WordPress 接続設定は `CLI 引数 > env > app_settings` の優先順位で解決します。
- `WORDPRESS_APPLICATION_PASSWORD` だけは `app_settings` に保存せず、Cloud Run Job またはローカル実行時の env に注入します。
- 本番の dashboard manual run を有効にする場合は、Web アプリ側で `MANUAL_RUN_MODE=cloud_run_job` を設定し、Cloud Run Service の service account に対象 Job の実行権限を付与します。

## ローカル実行

前提:

- `scripts/run-fetch-gsc.sh`, `scripts/run-crawl-internal-links.sh`, `scripts/run-sync-wordpress-posts.sh` は repo 直下の `.env.local` を自動で読み込みます。
- `fetch_gsc` をローカルで動かす場合は、事前に `gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/webmasters.readonly` を実行して ADC を作成してください。
- `fetch_gsc` の実行アカウントには Search Console の `https://prosports.yoshilover.com/` property への `Full user` 以上の権限が必要です。権限がない場合は `HttpError 403` で 0 rows になります。

画面:

- `/dashboard`: KPI、推移、alert 一覧、手動実行、Slack 通知送信
- `/keywords`: keyword 別推移、target URL 一覧、rewrite marker
- `/rewrites`: WordPress 記事選択付きの rewrite 登録、履歴、記事単位の前後比較、候補抽出
- `/pages`: page KPI、rewrite / 内部リンク施策の成果判定、内部リンク状況
- `/clusters`: pillar / cluster / intent 単位の成果、rewrite 件数、内部リンク課題数
- `/links`: 内部リンク一覧、404、孤立ページ、内部リンク施策登録、前後比較
- `/settings`: tracked keywords、閾値、Slack Webhook、実行時刻、対象サイト設定

GSC Job をローカル実行:

```bash
sh scripts/run-fetch-gsc.sh --start-date=2026-03-14 --end-date=2026-03-16
```

BigQuery 書き込みを止めて取得だけ試す:

```bash
sh scripts/run-fetch-gsc.sh --start-date=2026-03-16 --end-date=2026-03-16 --skip-bigquery-write
```

内部リンク crawl をローカル実行:

```bash
sh scripts/run-crawl-internal-links.sh
```

WordPress 記事同期をローカル実行:

```bash
sh scripts/run-sync-wordpress-posts.sh --base-url=https://prosports.yoshilover.com --skip-bigquery-write --max-pages=1
```

`/settings` で保存済みの WordPress 設定を使う場合は、`WORDPRESS_BASE_URL` などを省略できます。Basic 認証を使う場合でも、実パスワードは `WORDPRESS_APPLICATION_PASSWORD` として別途注入が必要です。

Slack 通知をローカルから叩く:

```bash
curl -X POST http://localhost:3000/api/alerts/dispatch
```

readiness を確認:

```bash
curl http://localhost:3000/api/health
```

## WordPress / Cluster 運用

詳細な運用手順は [docs/wordpress-cluster-operations.md](./docs/wordpress-cluster-operations.md) を参照してください。ここでは最低限の前提と日常運用フローをまとめます。

### WordPress REST API 前提

- `sync_wordpress_posts` は `https://<base-url>/wp-json/wp/v2/<post-type>` を前提にします。
- 既定では `posts` + `publish` を同期し、必要な場合だけ `WORDPRESS_POST_TYPE` と `WORDPRESS_POST_STATUSES` で上書きします。
- 認証方式は `none` または `basic` です。`basic` を使う場合は `WORDPRESS_USERNAME` と `WORDPRESS_APPLICATION_PASSWORD` の両方が必要です。
- `app_settings` に保存するのは接続先や Secret Manager 参照名までで、実パスワード自体は保存しません。
- 同期される主な項目は `wp_post_id`, `url`, `slug`, `title`, `post_status`, `categories`, `tags`, `published_at`, `modified_at`, `content_hash`, `word_count` です。

### 日常運用フロー

1. WordPress 側で記事を追加、更新、URL 変更したら `sync_wordpress_posts` を先に実行して `wp_posts` を最新化します。
2. `/settings` の `tracked_keywords` で対象 keyword と `pillar / cluster / intent` を更新し、cluster 名を既存表記へ揃えます。
3. 本文、タイトル、構成変更は `/rewrites` に、内部リンク導線の変更は `/links` または `/pages` から `internal_link_events` に登録します。
4. `/clusters` で cluster 単位の露出と課題を見てから、`/pages`, `/keywords`, `/rewrites`, `/links` へ drilldown して原因を切り分けます。
5. 施策後は `7日` または `14日` の比較窓で before / after を確認し、`needs_review` の場合は crawl 不足や low impressions を先に疑います。

### 施策成果判定の見方

- `positive`: 順位、clicks、impressions、CTR、内部リンク差分が概ね改善しています。
- `negative`: 主要指標が悪化しています。直近の rewrite や crawl 条件も合わせて確認します。
- `mixed`: 良化と悪化が混在しています。CTR だけ改善、順位だけ悪化のようなケースです。
- `needs_review`: 比較対象の crawl snapshot 不足、比較窓不足、低 impressions などで判定を過信できない状態です。
- `insufficient_data`: before / after のどちらかに十分な観測値がありません。

`rewrites` と `internal_link_events` はどちらも `wp_post_id` を優先し、過去の URL snapshot と現在の `wp_posts.url` を束ねた article-level 集計で比較します。URL 変更直後は WordPress 同期が古いと比較結果が崩れるため、先に `sync_wordpress_posts` を更新してください。

## GCP 側で必要な API

- `run.googleapis.com`
- `cloudscheduler.googleapis.com`
- `cloudbuild.googleapis.com`
- `artifactregistry.googleapis.com`
- `bigquery.googleapis.com`
- `logging.googleapis.com`
- `searchconsole.googleapis.com`
- `iamcredentials.googleapis.com`
- `secretmanager.googleapis.com`

主に使うサービス:

- BigQuery
- Cloud Run Jobs
- Cloud Run Services
- Cloud Scheduler
- Cloud Logging
- Secret Manager

## BigQuery テーブル作成手順

1. dataset を作成します。

```bash
bq --location=asia-northeast1 mk --dataset "${GOOGLE_CLOUD_PROJECT}:${BIGQUERY_DATASET}"
```

2. migration を番号順で適用します。

```bash
export PROJECT_ID="${GOOGLE_CLOUD_PROJECT}"
export DATASET="${BIGQUERY_DATASET}"

for file in sql/migrations/*.sql; do
  envsubst < "${file}" | bq query --use_legacy_sql=false
done
```

3. 適用対象:

- `0001_create_daily_rankings.sql`
- `0002_create_rewrites.sql`
- `0003_create_internal_links.sql`
- `0004_create_tracked_keywords.sql`
- `0005_create_app_settings.sql`
- `0006_create_wp_posts.sql`
- `0007_add_wp_post_id_to_rewrites.sql`
- `0008_create_internal_link_events.sql`
- `0009_add_cluster_fields_to_tracked_keywords.sql`

SQL の配置ルールは [sql/README.md](./sql/README.md) を参照してください。

## Cloud Run Service デプロイ手順

運用画面は Cloud Run Service として deploy できます。詳細は [docs/cloud-run-service.md](./docs/cloud-run-service.md) を参照してください。

1. 必須環境変数を export します。

```bash
export GOOGLE_CLOUD_PROJECT="your-project"
export CLOUD_RUN_REGION="asia-northeast1"
export ARTIFACT_REGISTRY_REPOSITORY="seo-rank-tracker"
export CLOUD_RUN_SERVICE_NAME="seo-rank-tracker"
export CLOUD_RUN_SERVICE_ACCOUNT="seo-rank-tracker-web@your-project.iam.gserviceaccount.com"
export BIGQUERY_DATASET="seo_rank_tracker"
export BIGQUERY_LOCATION="asia-northeast1"
export GSC_PROPERTY_URI="https://prosports.yoshilover.com/"
export TARGET_SITE_HOST="prosports.yoshilover.com"
export MANUAL_RUN_CLOUD_RUN_REGION="${CLOUD_RUN_REGION}"
export MANUAL_RUN_FETCH_GSC_JOB_NAME="prosports-fetch-gsc"
```

2. build と deploy を実行します。

```bash
bash scripts/deploy-web-service.sh
```

補足:

- `scripts/deploy-web-service.sh` は `Dockerfile` と `cloudbuild.web.yaml` を使って Web アプリ image を build し、Cloud Run Service へ deploy します。
- `MANUAL_RUN_FETCH_GSC_JOB_NAME` を指定した場合、script は自動で `MANUAL_RUN_MODE=cloud_run_job` を有効化します。
- dashboard から `fetch_gsc` を起動する場合、Web Service の service account には対象 Job への `run.jobs.runWithOverrides`, `run.executions.get`, `run.executions.list` を含む権限が必要です。運用上は `roles/run.developer` を Job 側へ付与するのが簡単です。
- deploy script は完了後に service URL と `/api/health` の URL も表示します。

3. deploy 後に readiness を確認します。

```bash
curl "<cloud-run-service-url>/api/health"
```

## Cloud Run Jobs デプロイ手順

現在スクリプト化されている本番 Job は `fetch_gsc` と `crawl_internal_links` です。詳細は [docs/cloud-run-jobs.md](./docs/cloud-run-jobs.md) を参照してください。

### `fetch_gsc`

1. 必須環境変数を export します。

```bash
export GOOGLE_CLOUD_PROJECT="your-project"
export CLOUD_RUN_REGION="asia-northeast1"
export ARTIFACT_REGISTRY_REPOSITORY="seo-rank-tracker"
export CLOUD_RUN_JOB_NAME="prosports-fetch-gsc"
export CLOUD_RUN_JOB_SERVICE_ACCOUNT="fetch-gsc-job@your-project.iam.gserviceaccount.com"
export BIGQUERY_DATASET="seo_rank_tracker"
export BIGQUERY_LOCATION="asia-northeast1"
export GSC_PROPERTY_URI="https://prosports.yoshilover.com/"
export TARGET_SITE_HOST="prosports.yoshilover.com"
export FETCH_GSC_SECRET_MAPPINGS="GOOGLE_APPLICATION_CREDENTIALS_JSON=fetch-gsc-sa:latest"
```

2. build と deploy を実行します。

```bash
bash scripts/deploy-fetch-gsc-job.sh
```

3. 手動実行例:

```bash
gcloud run jobs execute "${CLOUD_RUN_JOB_NAME}" \
  --region="${CLOUD_RUN_REGION}" \
  --args=--start-date=2026-03-14,--end-date=2026-03-16 \
  --wait
```

補足:

- `fetch_gsc` は `jobs/fetch_gsc/Dockerfile` を使用します。
- Cloud Run Job は `scripts/run-fetch-gsc.sh` 経由で `python -m jobs.fetch_gsc.main` を起動します。

### `crawl_internal_links`

1. 必須環境変数を export します。

```bash
export GOOGLE_CLOUD_PROJECT="your-project"
export CLOUD_RUN_REGION="asia-northeast1"
export ARTIFACT_REGISTRY_REPOSITORY="seo-rank-tracker"
export CRAWL_INTERNAL_LINKS_JOB_NAME="prosports-crawl-internal-links"
export CRAWL_INTERNAL_LINKS_JOB_SERVICE_ACCOUNT="crawl-internal-links@your-project.iam.gserviceaccount.com"
export BIGQUERY_DATASET="seo_rank_tracker"
export BIGQUERY_LOCATION="asia-northeast1"
export TARGET_SITE_HOST="prosports.yoshilover.com"
export CRAWL_INTERNAL_LINKS_START_URL="https://prosports.yoshilover.com/"
```

2. build と deploy を実行します。

```bash
bash scripts/deploy-crawl-internal-links-job.sh
```

3. 手動実行例:

```bash
gcloud run jobs execute "${CRAWL_INTERNAL_LINKS_JOB_NAME}" \
  --region="${CLOUD_RUN_REGION}" \
  --args=--max-pages=60 \
  --wait
```

補足:

- `crawl_internal_links` は `jobs/crawl_internal_links/Dockerfile` を使用します。
- Cloud Run Job は `scripts/run-crawl-internal-links.sh` 経由で `python -m jobs.crawl_internal_links.main` を起動します。
- 開始 URL は env 未指定時に `https://${TARGET_SITE_HOST}/` を使います。
- `--max-pages` や `--request-timeout-seconds` を Job 既定値にしたい場合は `CRAWL_INTERNAL_LINKS_DEFAULT_ARGS` を使います。

## Cloud Scheduler 設定手順

Cloud Scheduler の詳細は [docs/cloud-scheduler-operations.md](./docs/cloud-scheduler-operations.md) を参照してください。

### `fetch_gsc`

1. `fetch_gsc` Job を先に deploy します。
2. Scheduler 用 service account を用意し、Cloud Run Admin API を叩ける権限を付与します。
3. 次の環境変数を設定して deploy します。

```bash
export GOOGLE_CLOUD_PROJECT="your-project"
export CLOUD_RUN_REGION="asia-northeast1"
export CLOUD_RUN_JOB_NAME="prosports-fetch-gsc"
export CLOUD_SCHEDULER_LOCATION="asia-northeast1"
export CLOUD_SCHEDULER_JOB_NAME="prosports-fetch-gsc-daily"
export CLOUD_SCHEDULER_SERVICE_ACCOUNT="scheduler-invoker@your-project.iam.gserviceaccount.com"
```

4. create / update を実行します。

```bash
bash scripts/deploy-fetch-gsc-scheduler.sh
```

既定値:

- schedule: `0 6 * * *`
- time zone: `Asia/Tokyo`
- Cloud Scheduler retry: `0`
- Cloud Run Job task retry: `1`

### `crawl_internal_links`

1. `crawl_internal_links` Job を先に deploy します。
2. Scheduler 用 service account を用意し、Cloud Run Admin API を叩ける権限を付与します。
3. 次の環境変数を設定して deploy します。

```bash
export GOOGLE_CLOUD_PROJECT="your-project"
export CLOUD_RUN_REGION="asia-northeast1"
export CRAWL_INTERNAL_LINKS_JOB_NAME="prosports-crawl-internal-links"
export CRAWL_INTERNAL_LINKS_SCHEDULER_LOCATION="asia-northeast1"
export CRAWL_INTERNAL_LINKS_SCHEDULER_JOB_NAME="prosports-crawl-internal-links-daily"
export CRAWL_INTERNAL_LINKS_SCHEDULER_SERVICE_ACCOUNT="scheduler-invoker@your-project.iam.gserviceaccount.com"
```

4. create / update を実行します。

```bash
bash scripts/deploy-crawl-internal-links-scheduler.sh
```

既定値:

- schedule: `30 6 * * *`
- time zone: `Asia/Tokyo`
- Cloud Scheduler retry: `0`
- Cloud Run Job task retry: `1`

## GitHub Actions

GitHub Actions による CI / deploy 手順は [docs/github-actions-deploy.md](./docs/github-actions-deploy.md) を参照してください。

- `.github/workflows/ci.yml`
  - `npm run typecheck`, `npm run lint`, `npm run build`, Python unittest を実行します。
- `.github/workflows/deploy-gcp.yml`
  - `main` push または `workflow_dispatch` で Cloud Run Service、`fetch_gsc` Job / Scheduler、`crawl_internal_links` Job / Scheduler を deploy できます。
- 認証は Workload Identity Federation 前提です。
- deploy workflow は repo variables から GCP の resource 名や dataset を読み、repo secrets から WIF 設定を読みます。

## 障害時のログ確認手順

構造化ログの契約は [docs/logging-contract.md](./docs/logging-contract.md) を参照してください。

`execution_id` で 1 実行を追う:

```bash
gcloud logging read \
  'jsonPayload.execution_id="20260316-fetch-gsc-123456-abcd"' \
  --project="${GOOGLE_CLOUD_PROJECT}" \
  --limit=100 \
  --format=json
```

`fetch_gsc` のエラーだけを見る:

```bash
gcloud logging read \
  'jsonPayload.job_name="fetch_gsc" AND severity>=ERROR' \
  --project="${GOOGLE_CLOUD_PROJECT}" \
  --freshness=7d \
  --limit=100 \
  --format=json
```

`dispatch_alerts` の通知失敗を見る:

```bash
gcloud logging read \
  'jsonPayload.job_name="dispatch_alerts" AND severity>=ERROR' \
  --project="${GOOGLE_CLOUD_PROJECT}" \
  --freshness=7d \
  --limit=100 \
  --format=json
```

切り分けの基本手順:

1. Cloud Scheduler が予定時刻に実行を作れているか確認する。
2. `execution_id`, `failed_step`, `error_message` を Cloud Logging で見る。
3. BigQuery 側なら dataset / table / permission を確認する。
4. Search Console 側なら property 権限と認証情報を確認する。
5. Slack 通知側なら `settings` の Webhook 設定と `dispatch_alerts` ログを確認する。

## 既知の制約

- `fetch_scrape` は未実装です。
- alert 通知には配信履歴テーブルがないため、`/api/alerts/dispatch` を繰り返し実行すると同じ alert を再送します。
- `fetch_gsc` / `crawl_internal_links` は `app_settings` をまだ読まず、env ベースで動きます。
- `sync_wordpress_posts` は平文設定を `app_settings` から読めますが、`WORDPRESS_APPLICATION_PASSWORD` 自体は env / Secret Manager 注入が必要です。
- `sync_wordpress_posts` は同期時に取得できた記事を upsert するだけで、未取得になった `wp_posts` を自動削除しません。trash / 削除記事の整理は別運用が必要です。
- dashboard manual run の stdout / stderr tail は `local_process` mode 専用です。`cloud_run_job` mode では Cloud Run execution と Cloud Logging を確認します。
- 既存の `rewrites` への `wp_post_id` backfill は migration 実行時の URL 一致ベースなので、過去に URL が変わっていて一致しない行は手動で再紐付けが必要です。
- `internal_link_events` は内部リンク施策専用です。本文やタイトルの更新は引き続き `rewrites` に分けて登録します。
- 施策成果判定は `7日` または `14日` の比較窓を選べますが、`internal_links` は change_date 前後の最寄り crawl snapshot を使うため、比較窓内に crawl がない場合は `needs_review` になります。
- article-level の前後比較は `wp_post_id` と既知の URL snapshot を使うため、`wp_post_id` がない古い施策や履歴に残っていない URL 変更は完全には吸収できません。
- `pillar` / `cluster` は現状 freeform 文字列で、表記ゆれの自動正規化や master 管理はありません。同じ cluster は同一表記で揃える必要があります。
- Slack Webhook の実送信は外部ネットワークと有効な webhook が必要です。

## 将来の拡張項目

- `fetch_scrape` 実装と feature flag 制御
- `sync_wordpress_posts` の Cloud Run Job / Scheduler 化
- alert 配信履歴の保存と重複送信抑止
- Slack 以外の通知先追加
- 運用 API の認証強化
- `fetch_gsc` / `crawl_internal_links` も `app_settings` を control plane として参照させる
- cluster master / rename 補助 UI の追加と表記ゆれ検知

## 参考ドキュメント

- [docs/cloud-run-jobs.md](./docs/cloud-run-jobs.md)
- [docs/cloud-run-service.md](./docs/cloud-run-service.md)
- [docs/cloud-scheduler-operations.md](./docs/cloud-scheduler-operations.md)
- [docs/github-actions-deploy.md](./docs/github-actions-deploy.md)
- [docs/logging-contract.md](./docs/logging-contract.md)
- [docs/wordpress-cluster-operations.md](./docs/wordpress-cluster-operations.md)
- [docs/decisions.md](./docs/decisions.md)
