# 11. Cloud Run Jobs と Docker 化

## 目的
ローカル Job を Cloud Run Jobs で実行できる形へパッケージ化する。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 GSC 取得 Job 用の Dockerfile を作成する
- 【×】 実行コマンドと引数の受け渡し方法を整理する
- 【×】 環境変数の注入方法を Secret Manager 前提で整理する
- 【×】 Cloud Run Jobs デプロイ時の最小設定をまとめる
- 【×】 ローカル実行と Cloud Run 実行で共通コードを使えるようにする
- 【×】 Job コンテナ内でも構造化ログが出ることを確認する

## TODO
- 【×】 GSC 取得 Job 用の Dockerfile を作成する
- 【×】 実行コマンドと引数の受け渡し方法を整理する
- 【×】 環境変数の注入方法を Secret Manager 前提で整理する
- 【×】 Cloud Run Jobs デプロイ時の最小設定をまとめる
- 【×】 ローカル実行と Cloud Run 実行で共通コードを使えるようにする
- 【×】 Job コンテナ内でも構造化ログが出ることを確認する

## 完了条件
- Cloud Run Jobs にデプロイ可能な成果物が揃っている
- 手動またはスケジュール実行に必要な引数設計が決まっている

## 依存
- [04. 構造化ログと execution_id 基盤](./04-structured-logging-and-execution-id.md)
- [05. GSC 取得 Job 実装](./05-gsc-fetch-job.md)
- [06. daily_rankings への upsert と再取得制御](./06-daily-rankings-upsert-and-backfill.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `11` に着手。
- 2026-03-16: `jobs/fetch_gsc/Dockerfile` と `.dockerignore` を追加し、`fetch_gsc` を Cloud Run Jobs 向けコンテナとしてビルドできる形にした。
- 2026-03-16: `scripts/run-fetch-gsc.sh` を追加し、ローカル手動実行と Cloud Run コンテナ entrypoint から共通の `python -m jobs.fetch_gsc.main` を呼ぶ launcher に統一。
- 2026-03-16: `lib/manual-runs/registry.ts` を更新し、手動実行 API も共通 launcher を使うように変更。
- 2026-03-16: `scripts/deploy-fetch-gsc-job.sh` を追加し、Artifact Registry への build と Cloud Run Jobs deploy をまとめた。
- 2026-03-16: `docs/cloud-run-jobs.md` を追加し、引数設計、Secret Manager 注入方針、最小設定、実行例、ログ仕様を整理。
- 2026-03-16: 共通 launcher を local / Cloud Run 両方で使う判断を `docs/decisions.md` に記録。
- 2026-03-16: `sh scripts/run-fetch-gsc.sh --help`, `bash -n scripts/deploy-fetch-gsc-job.sh`, `python3 -m compileall jobs/fetch_gsc`, `npm run build`, `npm run typecheck`, `npm run lint` を実行し、通過を確認。
- 2026-03-19: `crawl_internal_links` についても `scripts/run-crawl-internal-links.sh`, `jobs/crawl_internal_links/Dockerfile`, `cloudbuild.crawl-internal-links.yaml`, `scripts/deploy-crawl-internal-links-job.sh` を追加し、`fetch_gsc` と同じ Cloud Run Job 導線へ載せた。
