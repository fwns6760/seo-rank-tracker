# 04. 構造化ログと execution_id 基盤

## 目的
全 Job 実行を追跡できる logging 基盤を先に整備する。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 実行ごとに一意な `execution_id` を採番する仕組みを作る
- 【×】 Cloud Logging 向けの構造化 JSON ログ出力ヘルパーを実装する
- 【×】 `INFO` `WARNING` `ERROR` の severity ルールを定義する
- 【×】 実行単位ログの共通項目を固定化する
- 【×】 ステップ単位ログの共通項目を固定化する
- 【×】 エラーログで `error_type`, `error_message`, `stacktrace`, `failed_step`, `recoverable` を残せるようにする
- 【×】 将来の Slack 通知でも `execution_id` を参照できる前提を整理する

## TODO
- 【×】 実行ごとに一意な `execution_id` を採番する仕組みを作る
- 【×】 Cloud Logging 向けの構造化 JSON ログ出力ヘルパーを実装する
- 【×】 `INFO` `WARNING` `ERROR` の severity ルールを定義する
- 【×】 実行単位ログの共通項目を固定化する
- 【×】 ステップ単位ログの共通項目を固定化する
- 【×】 エラーログで `error_type`, `error_message`, `stacktrace`, `failed_step`, `recoverable` を残せるようにする
- 【×】 将来の Slack 通知でも `execution_id` を参照できる前提を整理する

## 完了条件
- Job 実行単位とステップ単位の両方で構造化ログを残せる
- 障害時に `execution_id` から追跡できる

## 依存
- [01. プロジェクト基盤セットアップ](./01-project-bootstrap.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `04` に着手。
- 2026-03-16: `lib/logging/` に `execution_id` 生成、structured logger、job logger、型定義、公開エントリポイントを追加。
- 2026-03-16: `docs/logging-contract.md` を追加し、必須フィールド、ジョブ/ステップ/エラーログ契約、Slack での `execution_id` 利用前提を整理。
- 2026-03-16: `npm run typecheck`, `npm run lint`, `npm run build` を実行し、通過を確認。
