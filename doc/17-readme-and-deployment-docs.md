# 17. README と運用ドキュメント整備

## 目的
ローカル実行と GCP デプロイの再現性を確保し、運用手順を引き継げる状態にする。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 セットアップ手順を README に記載する
- 【×】 必須環境変数一覧を README に記載する
- 【×】 GCP 側で必要な API を README に記載する
- 【×】 BigQuery テーブル作成手順を README に記載する
- 【×】 Cloud Run Jobs デプロイ手順を README に記載する
- 【×】 Cloud Scheduler 設定手順を README に記載する
- 【×】 障害時のログ確認手順を README に記載する
- 【×】 既知の制約を README に記載する
- 【×】 将来の拡張項目を README に記載する

## TODO
- 【×】 セットアップ手順を README に記載する
- 【×】 必須環境変数一覧を README に記載する
- 【×】 GCP 側で必要な API を README に記載する
- 【×】 BigQuery テーブル作成手順を README に記載する
- 【×】 Cloud Run Jobs デプロイ手順を README に記載する
- 【×】 Cloud Scheduler 設定手順を README に記載する
- 【×】 障害時のログ確認手順を README に記載する
- 【×】 既知の制約を README に記載する
- 【×】 将来の拡張項目を README に記載する

## 完了条件
- 新規メンバーでもローカル実行とデプロイが追える
- AGENTS.md にある README 必須項目を満たしている

## 依存
- [11. Cloud Run Jobs と Docker 化](./11-cloud-run-jobs-and-docker.md)
- [12. Cloud Scheduler と運用設定](./12-cloud-scheduler-and-operations.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `17` に着手。
- 2026-03-16: `README.md` を全面更新し、セットアップ、必須環境変数、GCP API、BigQuery 初期化、Cloud Run Jobs、Cloud Scheduler、ログ調査、既知の制約、将来拡張を一通り整理。
- 2026-03-16: `app/api/README.md` を更新し、実装済みの operational API route 一覧と共通ルールを反映。
- 2026-03-16: `17` はドキュメント更新のみのため追加の build / lint は行わず、直前の `16` 実装で `npm run build`, `npm run typecheck`, `npm run lint` 通過済みの状態を維持。
- 2026-03-17: `.env.local.example` に manual run の Cloud Run 関連 env を追記し、README の migration 一覧へ `0009_add_cluster_fields_to_tracked_keywords.sql` を補った。`app/api/README.md` に `GET /api/manual-runs` も追記した。
- 2026-03-17: `GET /api/health` を追加し、README / Cloud Run Service doc / API doc に readiness check 手順を追記した。
- 2026-03-17: `/api/health` も他 route と同様に `execution_id` 付きの構造化ログを出すよう補正し、degraded 時は warning として Cloud Logging から追えるようにした。
- 2026-03-17: `/settings` からも env readiness を見られる system health panel を追加し、設定漏れ時の一次確認導線を API JSON 依存だけでなく UI にも広げた。
- 2026-03-17: `scripts/deploy-web-service.sh` が deploy 後に service URL と health endpoint を表示するようにし、README / Cloud Run Service doc に post-deploy readiness check を追記した。
- 2026-03-19: `crawl_internal_links` の Cloud Run Job / Scheduler 化に合わせて `.env.local.example`, `README.md`, `docs/cloud-run-jobs.md`, `docs/cloud-scheduler-operations.md`, `docs/github-actions-deploy.md` を更新し、ローカル実行・deploy・GitHub Actions variables の導線を追補した。
