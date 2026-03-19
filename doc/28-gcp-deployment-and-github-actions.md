# 28. GCP デプロイと GitHub Actions

## 目的
Web アプリを Cloud Run Service へ deploy できるようにし、`fetch_gsc` Job / Scheduler とあわせて GitHub Actions から継続デプロイできる状態にする。

## 重要事項
- 【×】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【×】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【×】 このチケットで行った作業は都度 `作業ログ` に追記する

## TODO
- 【×】 Web アプリ用の Cloud Run Service deploy 導線を追加する
- 【×】 dashboard manual run を Cloud Run Job 実行でも使えるようにする
- 【×】 CI 用 GitHub Actions workflow を追加する
- 【×】 GCP deploy 用 GitHub Actions workflow を追加する
- 【×】 README と deploy docs を更新する

## 完了条件
- Web アプリを Cloud Run Service として deploy できる
- `main` push または手動起動で GitHub Actions から deploy できる
- production の dashboard manual run が Cloud Run Job 実行に対応する

## 依存
- [11. Cloud Run Jobs と Docker 化](./11-cloud-run-jobs-and-docker.md)
- [12. Cloud Scheduler と運用設定](./12-cloud-scheduler-and-operations.md)
- [17. README と運用ドキュメント整備](./17-readme-and-deployment-docs.md)

## 作業ログ
- 2026-03-17: チケット作成。
- 2026-03-17: `Dockerfile`, `cloudbuild.web.yaml`, `scripts/deploy-web-service.sh` を追加し、Next.js Web アプリを Cloud Run Service として build / deploy できるようにした。
- 2026-03-17: `next.config.ts` を `output: "standalone"` に変更し、Cloud Run 向けの軽量 runtime image を組めるようにした。
- 2026-03-17: `lib/manual-runs/cloud-run.ts` を追加し、`MANUAL_RUN_MODE=cloud_run_job` 時は dashboard manual run が Cloud Run Job API で `fetch_gsc` を起動するようにした。
- 2026-03-17: `.github/workflows/ci.yml` と `.github/workflows/deploy-gcp.yml` を追加し、CI と GCP deploy の GitHub Actions を整備した。
- 2026-03-17: `README.md`, `docs/cloud-run-service.md`, `docs/github-actions-deploy.md`, `docs/decisions.md`, `app/api/README.md` を更新し、Cloud Run Service / GitHub Actions / production manual run の運用手順を記録した。
- 2026-03-17: `.venv/bin/python -m unittest discover -s tests -p 'test_*.py'`, `npm run lint`, `npm run build`, `npm run typecheck` を実行し、通過を確認した。
- 2026-03-17: 本番 `baseballsite.seo_rank_tracker` に `0007_add_wp_post_id_to_rewrites.sql`, `0008_create_internal_link_events.sql`, `0009_add_cluster_fields_to_tracked_keywords.sql` を適用し、deploy 前に schema を現行アプリへ合わせた。
- 2026-03-17: `family-fetch-gsc` Job、`family-fetch-gsc-daily` Scheduler、`seo-rank-tracker-web` Cloud Run Service を `asia-northeast1` に deploy し、`seo-web-runtime@baseballsite.iam.gserviceaccount.com` へ `family-fetch-gsc` の `roles/run.developer` を付与して dashboard manual run の本番導線を有効化した。
- 2026-03-17: `family-fetch-gsc` の初回実行自体は成功したが、`sc-domain:yoshilover.com` に対して service account の Search Console 権限が不足しており、構造化ログ上は `completed_with_warnings` / `HttpError 403` で 0 rows だった。GSC property access 付与後に再実行が必要。
- 2026-03-17: 実運用サブドメインが `prosports.yoshilover.com` であることを受け、README / UI / テスト / deploy 例の `family.yoshilover.com` を `prosports.yoshilover.com` へ補正した。本番 deploy も `https://prosports.yoshilover.com/` property と `prosports.yoshilover.com` host に揃えて再反映する。
- 2026-03-17: Cloud Run Job / Cloud Scheduler の本番リソース名も `prosports-fetch-gsc`, `prosports-fetch-gsc-daily` へ切り替え、`seo-rank-tracker-web` の manual run 参照先も新 Job 名へ更新する。旧 `family-*` リソースは rollback 用に残す。
- 2026-03-17: `seo-web-runtime@baseballsite.iam.gserviceaccount.com` に `roles/bigquery.dataEditor` を追加し、`prosports-fetch-gsc --days=30` を再実行した。Search Console から `2026-02-16` から `2026-03-17` の `51 rows` を取得し、BigQuery upsert まで正常完了した。
- 2026-03-17: `seo-rank-tracker-web` に `allUsers:roles/run.invoker` を追加して未認証公開した。`/` は `307 -> /dashboard`, `/dashboard` は `200` を確認。次回 deploy で公開状態を維持するには GitHub Actions repository variable `WEB_ALLOW_UNAUTHENTICATED=true` が必要。
- 2026-03-17: production dashboard が BigQuery の nullable string parameter 取り扱い差異で空表示になっていたため、`lib/bq/query-runner.ts` と dashboard / alert SQL を補正して `seo-rank-tracker-web-00006-kcm` を deploy した。deploy 後の RSC payload 上で KPI `2 / 11.00 / 0 / 0`、30日 / 90日 trend、重要ページ一覧の復旧を確認した。
- 2026-03-17: `prosports-fetch-gsc --days=90` を本番で再実行し、execution `prosports-fetch-gsc-24q88` が成功した。Cloud Logging 上は `fetched_rows=170`, `inserted_rows=119`, `updated_rows=51`, `error_count=0` で、`daily_rankings` は `2026-01-13` から `2026-03-14` までの `170 rows` に拡張された。
- 2026-03-19: `.github/workflows/deploy-gcp.yml` と deploy scripts を拡張し、variables が揃っていれば `crawl_internal_links` の Cloud Run Job / Scheduler も同じ workflow から deploy できるようにした。現時点では workflow 追加のみで、本番 deploy 自体は未実施。
- 2026-03-19: `prosports-crawl-internal-links` Job を `asia-northeast1` へ deploy し、`seo-web-runtime@baseballsite.iam.gserviceaccount.com` を runtime service account として設定した。続けて `prosports-crawl-internal-links-daily` Scheduler を `06:30 JST` で作成し、初回 smoke run `prosports-crawl-internal-links-lrjnd` が成功した。
