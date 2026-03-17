# 15. settings と tracked_keywords 管理

## 目的
監視対象や閾値を画面から管理できるようにし、運用設定を固定化する。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 `tracked_keywords` テーブルを利用した設定管理フローを作る
- 【×】 監視対象キーワードを登録、更新、無効化できるようにする
- 【×】 `target_url`, `category`, `priority`, `is_active` を管理できるようにする
- 【×】 閾値設定を保持できるようにする
- 【×】 Slack Webhook 設定欄を用意する
- 【×】 実行時刻の設定欄を用意する
- 【×】 対象サイト設定を保持できるようにする
- 【×】 設定変更が将来の Job やアラートに反映される前提を整理する

## TODO
- 【×】 `tracked_keywords` テーブルを利用した設定管理フローを作る
- 【×】 監視対象キーワードを登録、更新、無効化できるようにする
- 【×】 `target_url`, `category`, `priority`, `is_active` を管理できるようにする
- 【×】 閾値設定を保持できるようにする
- 【×】 Slack Webhook 設定欄を用意する
- 【×】 実行時刻の設定欄を用意する
- 【×】 対象サイト設定を保持できるようにする
- 【×】 設定変更が将来の Job やアラートに反映される前提を整理する

## 完了条件
- 監視対象と通知設定を画面上で管理できる
- tracked_keywords が他画面や Job の基準データとして使える

## 依存
- [02. BigQuery テーブル設計と SQL 整備](./02-bigquery-schema-and-sql.md)
- [03. BigQuery 接続レイヤーとクエリ基盤](./03-bigquery-data-access-layer.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `15` に着手。
- 2026-03-16: `sql/migrations/0005_create_app_settings.sql` と settings 向け SQL を追加し、`app_settings` / `tracked_keywords` の読み書きクエリを整備。
- 2026-03-16: `lib/settings/config.ts`, `lib/validators/settings.ts`, `lib/bq/settings.ts` を追加し、運用設定の既定値、入力検証、BigQuery アクセス層を `lib/` 配下へ集約。
- 2026-03-16: `app/api/settings/tracked-keywords/route.ts`, `app/api/settings/app-config/route.ts` を追加し、構造化ログ付きの settings 更新 API を実装。
- 2026-03-16: `components/tracked-keyword-form.tsx`, `components/tracked-keyword-status-button.tsx`, `components/app-settings-form.tsx` と `app/settings/page.tsx` を実装し、tracked keyword の登録、編集、無効化と運用設定の保存 UI を追加。
- 2026-03-16: `app_settings` を設定保存先として追加し、既存 Job は当面 env を参照したまま後続チケットで `app_settings` を読む方針、`tracked_keywords` は `keyword + target_url` を論理キーにする判断を `docs/decisions.md` に記録。
- 2026-03-16: `app_settings` への更新は同時 `MERGE` を避けて逐次実行にし、`priority` と `schedulerTimeJst` の validation を補強。
- 2026-03-16: `npm run build`, `npm run typecheck`, `npm run lint` を実行し、通過を確認。
