# 14. internal_links 機能

## 目的
内部リンクの実態を収集し、孤立ページや 404 を可視化できるようにする。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 `jobs/crawl_internal_links/` に内部リンククロール Job を実装する
- 【×】 `internal_links` テーブルへ保存する
- 【×】 `source_url`, `target_url`, `anchor_text`, `status_code` を保持する
- 【×】 発リンク数、被リンク数を集計する
- 【×】 孤立ページ検出ロジックを実装する
- 【×】 404 リンク検出ロジックを実装する
- 【×】 links 画面に内部リンク一覧を表示する
- 【×】 リンク元 URL とアンカーテキストを確認できるようにする

## TODO
- 【×】 `jobs/crawl_internal_links/` に内部リンククロール Job を実装する
- 【×】 `internal_links` テーブルへ保存する
- 【×】 `source_url`, `target_url`, `anchor_text`, `status_code` を保持する
- 【×】 発リンク数、被リンク数を集計する
- 【×】 孤立ページ検出ロジックを実装する
- 【×】 404 リンク検出ロジックを実装する
- 【×】 links 画面に内部リンク一覧を表示する
- 【×】 リンク元 URL とアンカーテキストを確認できるようにする

## 完了条件
- 内部リンクの改善判断に必要な情報を画面表示できる
- 孤立ページと 404 を抽出できる

## 依存
- [02. BigQuery テーブル設計と SQL 整備](./02-bigquery-schema-and-sql.md)
- [03. BigQuery 接続レイヤーとクエリ基盤](./03-bigquery-data-access-layer.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `14` に着手。
- 2026-03-16: `jobs/crawl_internal_links/` に config, crawler, BigQuery writer, main, models, requirements を追加し、同一ホストの内部リンク crawl Job を実装。
- 2026-03-16: `sql/queries/count_existing_internal_links_from_stage.sql`, `merge_internal_links_from_stage.sql` を追加し、`internal_links` への staging + MERGE upsert を実装。
- 2026-03-16: `sql/queries/links_latest_summary.sql`, `links_latest_rows.sql`, `links_broken_404.sql`, `links_orphan_pages.sql` を追加し、links 画面向け集計 SQL を分離。
- 2026-03-16: `lib/bq/links.ts` と関連型を追加し、links 画面専用の BigQuery 読み出しを `lib/` 配下へ集約。
- 2026-03-16: `app/links/page.tsx` を実装し、内部リンク一覧、404 リンク、孤立ページ、最新 crawl summary を確認できる画面を追加。
- 2026-03-16: crawler の開始 URL は既定で `https://${TARGET_SITE_HOST}/`、orphan は最新 crawl で被リンク 0 かつ `daily_rankings` に存在する URL とする判断を `docs/decisions.md` に記録。
- 2026-03-16: `npm run build`, `npm run typecheck`, `npm run lint`, `python3 -m compileall jobs/crawl_internal_links`, `.venv/bin/python -m unittest discover -s tests/crawl_internal_links -p 'test_*.py'`, `.venv/bin/python -m jobs.crawl_internal_links.main --help` を実行し、通過を確認。
