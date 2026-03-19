# 22. internal_link_events 追加

## 目的
内部リンク改善を「いつ・どの記事に対して行ったか」記録し、施策前後比較の基準日を持てるようにする。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## TODO
- 【×】 `internal_link_events` テーブル用 migration を追加する
- 【×】 `url`, `wp_post_id`, `change_date`, `summary`, `memo` を保持する
- 【×】 登録 API と入力 UI を追加する
- 【×】 `/links` や `/pages` から内部リンク施策を登録できる導線を作る
- 【×】 rewrite と内部リンク施策を混同しないよう運用ルールを整理する

## 完了条件
- 内部リンク改善の実施日を記録できる
- 施策前後比較に使う基準日を画面から管理できる

## 依存
- [14. internal_links 機能](./14-internal-links-feature.md)
- [18. WordPress 記事マスタ同期基盤](./18-wordpress-post-sync-foundation.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、内部リンク施策は `rewrites` と混ぜず、URL snapshot + nullable `wp_post_id` を持つ `internal_link_events` として分離する方針で着手。
- 2026-03-16: `sql/migrations/0008_create_internal_link_events.sql` と `sql/queries/insert_internal_link_event.sql`, `internal_link_event_history.sql` を追加し、BigQuery schema と履歴取得 / 登録 SQL を実装。
- 2026-03-16: `lib/validators/internal-link-events.ts`, `lib/bq/internal-link-events.ts`, `app/api/internal-link-events/route.ts` を追加し、登録 API と BigQuery 層を実装。
- 2026-03-16: `components/internal-link-event-form.tsx` と `components/internal-link-event-history-list.tsx` を追加し、再利用可能な登録フォームと履歴 UI を実装。
- 2026-03-16: `app/links/page.tsx` を更新し、内部リンク施策登録フォーム、履歴一覧、rewrite との使い分けを明示する運用メモを追加。
- 2026-03-16: `app/pages/page.tsx` を更新し、ページ単位の内部リンク施策登録フォーム、履歴一覧、`/links` への導線を追加。
- 2026-03-16: `README.md`, `app/api/README.md`, `docs/decisions.md` を更新し、migration、API、運用ルールを反映。
- 2026-03-16: `npm run typecheck`, `npm run lint`, `npm run build` を実行し、通過を確認。
- 2026-03-17: `app/api/internal-link-events/route.ts` に `validate_input` / `insert_internal_link_event` の started/success step ログを追加し、validation 成否と BigQuery 反映を `execution_id` 単位で追跡しやすくした。
- 2026-03-17: `app/api/internal-link-events/route.ts` の logger 初期化を env 検証より先に移し、環境変数不足でも失敗ログが残るよう補正した。JSON 構文エラーも validation error として `400` に寄せた。
