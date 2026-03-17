# 19. sync_wordpress_posts Job

## 目的
WordPress REST API から記事情報を取得し、`wp_posts` へ同期する Job を実装する。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 `jobs/sync_wordpress_posts/` を追加する
- 【×】 WordPress REST API の page / pagination 取得を実装する
- 【×】 必要な認証方式を整理する
- 【×】 `wp_posts` への upsert を実装する
- 【×】 `execution_id` 付き構造化ログを出力する
- 【×】 ローカル実行と Cloud Run 実行を見据えた entrypoint を揃える

## TODO
- 【×】 `jobs/sync_wordpress_posts/` を追加する
- 【×】 WordPress REST API の page / pagination 取得を実装する
- 【×】 必要な認証方式を整理する
- 【×】 `wp_posts` への upsert を実装する
- 【×】 `execution_id` 付き構造化ログを出力する
- 【×】 ローカル実行と Cloud Run 実行を見据えた entrypoint を揃える

## 完了条件
- WordPress 記事一覧を BigQuery に同期できる
- 失敗時に `execution_id` で原因追跡できる

## 依存
- [04. 構造化ログと execution_id 基盤](./04-structured-logging-and-execution-id.md)
- [11. Cloud Run Jobs と Docker 化](./11-cloud-run-jobs-and-docker.md)
- [18. WordPress 記事マスタ同期基盤](./18-wordpress-post-sync-foundation.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `19` に着手。
- 2026-03-16: `jobs/sync_wordpress_posts/` 配下に `main.py`, `config.py`, `client.py`, `bigquery_writer.py`, `models.py`, `requirements.txt` を追加し、WordPress REST API 取得から `wp_posts` staging merge までの Job を実装。
- 2026-03-16: `sql/queries/count_existing_wp_posts_from_stage.sql` と `merge_wp_posts_from_stage.sql` を追加し、`wp_post_id` を論理キーにした BigQuery upsert を整備。
- 2026-03-16: `scripts/run-sync-wordpress-posts.sh` を追加し、ローカル実行と Cloud Run 実行で共通利用できる launcher を用意。
- 2026-03-16: `tests/sync_wordpress_posts/test_sync_wordpress_posts.py` を追加し、HTML 正規化、taxonomy mapping、pagination、重複排除を unittest 化。
- 2026-03-16: 認証方式は public REST API を既定とし、`WORDPRESS_USERNAME` と `WORDPRESS_APPLICATION_PASSWORD` の両方がある場合のみ Basic Auth を使う方針、taxonomy 未解決 ID は `category:<id>` / `tag:<id>` で保持する方針を `docs/decisions.md` に記録。
- 2026-03-16: `python3 -m compileall jobs/sync_wordpress_posts`, `.venv/bin/python -m unittest discover -s tests/sync_wordpress_posts -p 'test_*.py'`, `.venv/bin/python -m jobs.sync_wordpress_posts.main --help`, `sh scripts/run-sync-wordpress-posts.sh --help` を実行し、通過を確認。
- 2026-03-16: `sh scripts/run-sync-wordpress-posts.sh --base-url=https://prosports.yoshilover.com --skip-bigquery-write --max-pages=1` を smoke run し、public WordPress REST API から 100 件取得できることを確認。
- 2026-03-16: `GOOGLE_CLOUD_PROJECT=baseballsite BIGQUERY_DATASET=seo_rank_tracker BIGQUERY_LOCATION=asia-northeast1 sh scripts/run-sync-wordpress-posts.sh --base-url=https://prosports.yoshilover.com --max-pages=1` を実行し、`baseballsite.seo_rank_tracker.wp_posts` へ 100 件 insert まで完了することを確認。
