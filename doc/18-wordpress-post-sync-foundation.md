# 18. WordPress 記事マスタ同期基盤

## 目的
WordPress 記事を BigQuery に正規化保存し、記事単位の分析と施策紐付けの基盤を作る。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 `wp_posts` テーブル用 migration を追加する
- 【×】 `wp_post_id`, `url`, `slug`, `title`, `post_status`, `published_at`, `modified_at` を保持する
- 【×】 `categories`, `tags`, `content_hash`, `word_count` を保持する
- 【×】 `fetched_at`, `execution_id` を保持する
- 【×】 upsert の論理キーを整理する
- 【×】 partition / cluster 方針を決める

## TODO
- 【×】 `wp_posts` テーブル用 migration を追加する
- 【×】 `wp_post_id`, `url`, `slug`, `title`, `post_status`, `published_at`, `modified_at` を保持する
- 【×】 `categories`, `tags`, `content_hash`, `word_count` を保持する
- 【×】 `fetched_at`, `execution_id` を保持する
- 【×】 upsert の論理キーを整理する
- 【×】 partition / cluster 方針を決める

## 完了条件
- WordPress 記事メタを BigQuery で参照できる
- `url` と `wp_post_id` の両方で他テーブルと紐付けられる

## 依存
- [02. BigQuery テーブル設計と SQL 整備](./02-bigquery-schema-and-sql.md)
- [03. BigQuery 接続レイヤーとクエリ基盤](./03-bigquery-data-access-layer.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `18` に着手。
- 2026-03-16: `sql/migrations/0006_create_wp_posts.sql` を追加し、`wp_post_id`, `url`, `slug`, `title`, `post_type`, `post_status`, `published_at`, `modified_at`, `categories`, `tags`, `content_hash`, `word_count`, `fetched_at`, `execution_id` を保持する `wp_posts` テーブルを定義。
- 2026-03-16: `sql/queries/wp_post_list.sql`, `wp_post_by_url.sql`, `wp_post_by_id.sql`, `upsert_wp_post.sql` を追加し、後続 Job と画面参照に使う基本 SQL を整備。
- 2026-03-16: `lib/bq/wordpress.ts` と関連型 / export を追加し、`wp_posts` を `url` と `wp_post_id` の両方で参照できる BigQuery 層を実装。
- 2026-03-16: `wp_posts` の論理キーは `wp_post_id`、物理設計は `DATE(fetched_at)` partition と `wp_post_id`, `url`, `post_status` cluster、`categories` / `tags` は表示名の配列で保持する方針を `docs/decisions.md` に記録。
- 2026-03-16: `npm run build`, `npm run typecheck`, `npm run lint` を実行し、通過を確認。
- 2026-03-16: `baseballsite.seo_rank_tracker.wp_posts` テーブルを BigQuery に作成し、実環境へ反映。
