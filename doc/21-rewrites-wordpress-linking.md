# 21. rewrites と WordPress 記事の紐付け

## 目的
リライト履歴を WordPress 記事と明確に紐付け、施策対象を記事単位で追えるようにする。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## TODO
- 【×】 `rewrites` と `wp_posts` の紐付け方式を決める
- 【×】 `wp_post_id` を持つか URL join に寄せるか判断する
- 【×】 `/rewrites` の入力 UI で WordPress 記事を選べるようにする
- 【×】 `/pages` や `/rewrites` に記事タイトルなどの補助情報を表示する
- 【×】 既存 rewrite データの移行方針を整理する

## 完了条件
- リライト履歴を WordPress 記事単位で追える
- URL 変更や slug 変更があっても施策対象を識別しやすい

## 依存
- [13. rewrites 機能](./13-rewrites-feature.md)
- [18. WordPress 記事マスタ同期基盤](./18-wordpress-post-sync-foundation.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、`rewrites` の記事単位追跡は URL snapshot を残しつつ nullable の `wp_post_id` を追加する方針で着手。
- 2026-03-16: `sql/migrations/0007_add_wp_post_id_to_rewrites.sql` を追加し、`rewrites` へ `wp_post_id` を追加。既存行は `wp_posts.url = rewrites.url` の一致で best-effort backfill する移行を実装。
- 2026-03-16: `lib/validators/rewrites.ts`, `lib/bq/rewrites.ts`, `app/api/rewrites/route.ts`, `sql/queries/insert_rewrite.sql` を更新し、rewrite 登録時に `wp_post_id` を保存できるようにした。
- 2026-03-16: `components/rewrite-registration-form.tsx` と `app/rewrites/page.tsx` を更新し、WordPress 記事選択 UI、記事タイトル / Post ID 表示、候補検索、同一記事ベースの履歴表示を追加した。
- 2026-03-16: `sql/queries/rewrite_history.sql`, `rewrite_before_after_comparison.sql`, `page_rewrite_history.sql`, `keyword_rewrite_markers.sql`, `rewrite_opportunity_candidates.sql` を更新し、`wp_post_id` を優先した記事単位の rewrite 集計と marker / cooldown 判定へ寄せた。
- 2026-03-16: `app/pages/page.tsx` を更新し、選択 URL の WordPress 記事メタと、URL 変更後も追える rewrite 履歴表示を追加した。
- 2026-03-16: `README.md` と `docs/decisions.md` を更新し、schema 変更、best-effort backfill、URL snapshot + `wp_post_id` の保持方針を記録。
- 2026-03-16: `npm run typecheck`, `npm run lint`, `npm run build` を実行し、通過を確認。
