# SEO Rank Tracker 実装指示書

## 目的
yoshilover.com のサブドメイン `prosports.yoshilover.com` の記事を対象に、検索順位、表示回数、クリック数、CTR、リライト履歴、内部リンク状況を継続監視できる SEO モニタリングアプリを実装する。

本アプリの目的は次の3点。
1. リライト前後の順位変動を定量的に追う
2. 改善優先度の高い記事を見つける
3. 内部リンク改善の判断材料を作る

要件の原本は別紙の要件定義書を正とする。仕様差分が出た場合は、このファイルの内容をうのみにせず、差分をログに残してから実装する。

## 技術方針
### フロントエンド
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts

### バックエンド
- Cloud Run Jobs
- Cloud Scheduler
- Cloud Logging
- Secret Manager
- BigQuery

### データ基盤
- BigQuery は日付パーティション前提
- クラスタリング候補は url, keyword
- コストを意識してパーティション条件を必須にする

## 実装スコープ
### Phase 1
- GSC データ自動収集
- BigQuery 保存
- 順位推移ダッシュボード
- ページ別 KPI 一覧
- 前日比較サマリー
- 手動実行ボタン

### Phase 2
- リライト履歴登録
- リライト前後比較
- リライト候補自動抽出

### Phase 3
- 内部リンククロール
- 発リンク数、被リンク数、孤立ページ検出
- 404 リンク検出

### Phase 4
- 順位急落、急上昇アラート
- Slack 通知
- インデックス異常通知

## ディレクトリ構成
```text
seo-rank-tracker/
  app/
    dashboard/
    keywords/
    pages/
    rewrites/
    links/
    settings/
    api/
  components/
  lib/
    bq/
    gsc/
    logging/
    validators/
  jobs/
    fetch_gsc/
    fetch_scrape/
    crawl_internal_links/
  sql/
  docs/
  scripts/
  tests/
  .github/
  AGENTS.md
  README.md
画面要件
dashboard

主要 KPI カード

対象キーワード数

平均順位

前日比上昇数

前日比下落数

順位推移グラフ

7日

30日

90日

変動アラート一覧

重要ページ一覧

keywords

キーワード別順位推移

対象 URL

GSC 平均順位

スクレイピング順位

リライト実施日のマーカー表示

pages

URL 単位の表示回数

クリック数

CTR

関連キーワード一覧

リライト履歴

発リンク数

被リンク数

rewrites

リライト履歴登録

リライト種別

実施日

要約メモ

施策前後比較

links

内部リンク一覧

孤立ページ

404 リンク

リンク元 URL

アンカーテキスト

settings

監視対象キーワード

閾値

Slack Webhook

実行時刻

対象サイト設定

BigQuery テーブル定義
daily_rankings

date DATE

url STRING

keyword STRING

position FLOAT64

scrape_position INT64

impressions INT64

clicks INT64

ctr FLOAT64

source STRING

fetched_at TIMESTAMP

execution_id STRING

rewrites

id STRING

url STRING

rewrite_date DATE

rewrite_type STRING

summary STRING

memo STRING

created_at TIMESTAMP

updated_at TIMESTAMP

internal_links

crawl_date DATE

source_url STRING

target_url STRING

anchor_text STRING

status_code INT64

fetched_at TIMESTAMP

execution_id STRING

tracked_keywords

keyword STRING

target_url STRING

category STRING

priority STRING

is_active BOOL

created_at TIMESTAMP

updated_at TIMESTAMP

GSC 収集方針

Google Search Console API をメインソースにする

取得粒度は日次

基本ディメンションは date, page, query

収集対象指標は clicks, impressions, ctr, position

毎日直近 3 日分を再取得して upsert する

取得失敗時は処理を止めず、ログと通知を残す

スクレイピング方針

補助データとしてのみ扱う

監視対象は最大 100 キーワード前後

feature flag で ON/OFF 可能にする

リクエスト間隔、User-Agent、例外処理、再試行制御を入れる

絶対順位が取れない場合は null を許容する

GSC データを上書きしない

ログ要件

記録ログは必ず残すこと。

必須

すべての Job 実行で execution_id を採番する

すべてのログは構造化 JSON で出力する

Cloud Logging に出す

エラー時は severity=ERROR

正常完了時は severity=INFO

警告は severity=WARNING

1 実行ごとに最低限残す項目

execution_id

job_name

started_at

finished_at

duration_ms

target_site

fetched_rows

inserted_rows

updated_rows

skipped_rows

error_count

status

message

ステップ単位ログ

step

step_status

input_summary

output_summary

retry_count

エラーログ

error_type

error_message

stacktrace

failed_step

recoverable

ログ出力例
{
  "severity": "INFO",
  "execution_id": "20260316-fetch-gsc-001",
  "job_name": "fetch_gsc",
  "step": "insert_bigquery",
  "step_status": "success",
  "fetched_rows": 1240,
  "inserted_rows": 1180,
  "updated_rows": 60,
  "error_count": 0,
  "status": "completed",
  "message": "GSC daily import completed"
}
実装ルール
共通

破壊的変更は勝手にしない

テーブル schema 変更時は migration を作る

主要関数には JSDoc または docstring を付ける

環境変数は .env.local と Secret Manager で管理する

API キーや認証情報をコードに直書きしない

例外は握り潰さない

UI で null と未取得を区別する

日時は JST 表示を基本にする

フロント

Server Components 優先

グラフや操作系だけ Client Components に分離

DB 直アクセスを app 配下に散らさず lib に寄せる

フィルタ状態は URL クエリに寄せる

バックエンド

Job は単機能に分ける

1 Job 1 責務

冪等性を意識する

直近 3 日分の再取得 upsert を基本にする

BigQuery 書き込みは MERGE か staging 経由にする

SQL

SQL は sql/ に分離する

直接文字列連結を避ける

パーティション列条件を必ず入れる

高頻度集計は必要に応じて最適化を検討する

優先開発順
1

Next.js 初期化

Tailwind

shadcn/ui

BigQuery 接続

環境変数整理

2

daily_rankings 作成

GSC 取得 Job 作成

手動実行

BigQuery 反映

3

dashboard の KPI 表示

順位推移グラフ

URL フィルタ

キーワードフィルタ

4

Cloud Run Jobs 化

Cloud Scheduler 連携

Cloud Logging 監視

エラー通知

5

rewrites

internal_links

tracked_keywords

アラート機能

受け入れ条件
MVP 完了条件

毎日 1 回 GSC データが自動収集される

BigQuery に日次保存される

ダッシュボードで 7日、30日、90日の順位推移が見える

ページ別のクリック数、表示回数、CTR が見える

前日比の順位変動が見える

実行ログが Cloud Logging に残る

実行失敗時に原因がログから追える

品質条件

初回表示は極端に重くしない

エラー時に白画面で終わらない

未取得データが誤って 0 表示されない

execution_id で 1 実行を追跡できる

Codex への作業指示

リポジトリを初期化する

Next.js App Router 構成を作る

BigQuery 接続レイヤーを作る

GSC 取得 Job を Python で実装する

BigQuery の daily_rankings へ upsert する

dashboard に KPI と推移グラフを表示する

Cloud Run Jobs 用 Dockerfile を用意する

Cloud Scheduler から起動できる形にする

Cloud Logging へ構造化ログを出す

README にローカル実行手順と GCP デプロイ手順を書く

作業中に仕様不明点が出た場合は、推測で UI を作り込まず、docs/decisions.md に判断内容を追記してから実装すること。

README に必ず入れる内容

セットアップ手順

必須環境変数一覧

GCP 側で必要な API

BigQuery テーブル作成手順

Cloud Run Jobs デプロイ手順

Cloud Scheduler 設定手順

障害時のログ確認手順

既知の制約

将来の拡張項目

GCP 側で使う主要サービス

BigQuery

Cloud Run Jobs

Cloud Scheduler

Cloud Logging

Secret Manager

備考

要件定義書の Phase 設計を踏襲する

まずは Phase 1 完了を最優先

スクレイピングは後回しでよい

ログが見えない実装は不採用

将来の Slack 通知追加を前提に execution_id 設計を最初から入れる
