# API

運用向けの route handler は `app/api/` 配下に集約しています。

## Routes

- `POST /api/manual-runs`
  - `fetch_gsc` をローカル process または Cloud Run Job として起動し、追跡用 run 情報を返す
- `GET /api/manual-runs/:executionId`
  - 手動実行の状態を返す。Cloud Run mode では stdout / stderr の代わりに execution resource を使って追跡する
- `POST /api/rewrites`
  - rewrite 履歴を `rewrites` テーブルへ保存する
- `POST /api/internal-link-events`
  - internal link 改善履歴を `internal_link_events` テーブルへ保存する
- `POST /api/settings/tracked-keywords`
  - `tracked_keywords` の登録、更新、有効 / 無効切り替えを行う
- `POST /api/settings/app-config`
  - `app_settings` の閾値、Slack Webhook、実行時刻、対象サイト設定を保存する
- `POST /api/alerts/dispatch`
  - 現在の alert 判定を集約し、Slack Webhook へ通知する

## 共通ルール

- `execution_id` を含む構造化ログを出力する
- BigQuery 直接アクセスは route 内に散らさず `lib/` 配下へ寄せる
- validation error は `400`、想定外エラーは `500` を返す
