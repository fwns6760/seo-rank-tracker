# 12. Cloud Scheduler と運用設定

## 目的
毎日 1 回の自動収集と、障害時に追跡できる運用導線を整える。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 Cloud Scheduler から Cloud Run Jobs を起動する設定を定義する
- 【×】 実行時刻の設定方針を整理する
- 【×】 失敗時の再実行方針を決める
- 【×】 Cloud Logging で `execution_id` を軸に追跡する手順をまとめる
- 【×】 将来のエラー通知追加を見据えた運用メモを残す
- 【×】 GCP 側で有効化が必要な API 一覧を整理する

## TODO
- 【×】 Cloud Scheduler から Cloud Run Jobs を起動する設定を定義する
- 【×】 実行時刻の設定方針を整理する
- 【×】 失敗時の再実行方針を決める
- 【×】 Cloud Logging で `execution_id` を軸に追跡する手順をまとめる
- 【×】 将来のエラー通知追加を見据えた運用メモを残す
- 【×】 GCP 側で有効化が必要な API 一覧を整理する

## 完了条件
- 定期実行の設定手順が明文化されている
- 障害発生時にログ確認の導線がある

## 依存
- [04. 構造化ログと execution_id 基盤](./04-structured-logging-and-execution-id.md)
- [11. Cloud Run Jobs と Docker 化](./11-cloud-run-jobs-and-docker.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `12` に着手。
- 2026-03-16: `scripts/deploy-fetch-gsc-scheduler.sh` を追加し、Cloud Scheduler の HTTP job を create / update で管理できるようにした。
- 2026-03-16: `docs/cloud-scheduler-operations.md` を追加し、必要 API、Scheduler topology、実行時刻、再実行方針、Cloud Logging 追跡手順、将来アラート方針を整理。
- 2026-03-16: Scheduler の既定時刻を `Asia/Tokyo` の毎日 `06:00`、Scheduler retry `0`、Cloud Run Job task retry `1` とする判断を `docs/decisions.md` に記録。
- 2026-03-16: `gcloud scheduler jobs create http --help`, `gcloud scheduler jobs update http --help`, `gcloud logging read --help`, `bash -n scripts/deploy-fetch-gsc-scheduler.sh` を実行し、CLI flag と script 構文を確認。
- 2026-03-19: `scripts/deploy-crawl-internal-links-scheduler.sh` を追加し、`crawl_internal_links` も Cloud Scheduler の HTTP job として create / update 管理できるようにした。既定時刻は `fetch_gsc` の後段となる `06:30 JST` とし、判断を `docs/decisions.md` に記録した。
