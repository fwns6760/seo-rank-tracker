# 07. 手動実行 API と起動 UI

## 目的
定期実行とは別に、管理画面から Job を手動起動できるようにする。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 手動実行用の API エンドポイントを作る
- 【×】 実行対象 Job と引数の扱いを整理する
- 【×】 dashboard から実行できる UI を用意する
- 【×】 実行開始時に `execution_id` を返せるようにする
- 【×】 実行中、成功、失敗の状態を UI で区別して表示する
- 【×】 エラー時に白画面ではなく操作可能な失敗表示にする

## TODO
- 【×】 手動実行用の API エンドポイントを作る
- 【×】 実行対象 Job と引数の扱いを整理する
- 【×】 dashboard から実行できる UI を用意する
- 【×】 実行開始時に `execution_id` を返せるようにする
- 【×】 実行中、成功、失敗の状態を UI で区別して表示する
- 【×】 エラー時に白画面ではなく操作可能な失敗表示にする

## 完了条件
- 管理画面から手動で GSC 取得 Job を起動できる
- 手動実行の成否を `execution_id` とともに追える

## 依存
- [04. 構造化ログと execution_id 基盤](./04-structured-logging-and-execution-id.md)
- [05. GSC 取得 Job 実装](./05-gsc-fetch-job.md)
- [06. daily_rankings への upsert と再取得制御](./06-daily-rankings-upsert-and-backfill.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `07` に着手。
- 2026-03-16: `lib/manual-runs/registry.ts` を追加し、`fetch_gsc` の子プロセス起動、`execution_id` 発番、stdout/stderr 保持、状態追跡を実装。
- 2026-03-16: `app/api/manual-runs` と `app/api/manual-runs/[executionId]` を追加し、手動起動 API と状態参照 API を実装。
- 2026-03-16: `components/manual-run-panel.tsx` を追加し、dashboard から日付指定、`skipBigQueryWrite` 指定、実行状態確認、ログ表示ができる UI を実装。
- 2026-03-16: Python Job 側で `EXECUTION_ID` を受け取れるように調整し、API が返す `execution_id` とジョブログの値を揃えた。
- 2026-03-16: `npm run typecheck`, `npm run lint`, `npm run build` を実行し、API route と dashboard UI を含めて通過を確認。
