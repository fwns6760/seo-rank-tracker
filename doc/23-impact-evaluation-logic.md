# 23. 施策成果判定ロジック追加

## 目的
リライトと内部リンク改善の前後比較ロジックを SQL と画面集計に追加し、施策成果を定量評価できるようにする。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## TODO
- 【×】 リライト施策の前後比較 SQL を記事単位で整理する
- 【×】 内部リンク施策の前後比較 SQL を追加する
- 【×】 `daily_rankings` と `internal_links` を使った改善指標を定義する
- 【×】 比較窓を `7日` または `14日` などで整理する
- 【×】 施策効果のスコアリングまたは判定ラベルを追加する
- 【×】 誤検知しやすいケースをログまたは UI で明示する

## 完了条件
- リライトと内部リンク施策の成果を前後比較で評価できる
- 判定に使う SQL と UI 表示の基準が揃っている

## 依存
- [21. rewrites と WordPress 記事の紐付け](./21-rewrites-wordpress-linking.md)
- [22. internal_link_events 追加](./22-internal-link-events.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、`wp_post_id` を持つ施策は URL snapshot と current URL を束ねた article-level 集計に切り替え、比較窓は画面から `7日 / 14日` を選べるようにする方針で着手。
- 2026-03-16: `sql/queries/rewrite_before_after_comparison.sql` を更新し、同一記事の履歴 URL と current URL を束ねて `daily_rankings` を集計し、score / label / evaluation_notes を返すようにした。
- 2026-03-16: `sql/queries/internal_link_event_before_after_comparison.sql` を追加し、`daily_rankings` の前後差分に加えて、change_date 前後の最寄り `internal_links` crawl snapshot から inbound / outbound / broken link 差分を比較できるようにした。
- 2026-03-16: `/rewrites`, `/links`, `/pages` に比較窓 `7日 / 14日` の切り替えと、score / label / note 付きの施策成果カードを追加した。
- 2026-03-16: `README.md`, `docs/decisions.md`, `doc/00-ticket-index.md` を更新し、判定基準と既知の注意点を反映した。
- 2026-03-16: `npm run build`, `npm run typecheck`, `npm run lint` を実行し、通過を確認。
