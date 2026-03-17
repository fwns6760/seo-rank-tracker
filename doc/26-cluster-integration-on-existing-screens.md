# 26. 既存画面の cluster 連携

## 目的
`pages`, `keywords`, `rewrites`, `links` 画面に cluster 情報を反映し、個別画面でもトピック構造を見失わないようにする。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## TODO
- 【×】 `/pages` に pillar / cluster 表示を追加する
- 【×】 `/keywords` に cluster フィルタと関連 query 表示を追加する
- 【×】 `/rewrites` に cluster 単位の候補・履歴表示を追加する
- 【×】 `/links` に cluster ごとの孤立・404・被リンク不足を表示する
- 【×】 既存画面の URL クエリと cluster フィルタを整合させる

## 完了条件
- 既存画面のどこからでも cluster 文脈でデータを読める
- cluster と記事 / keyword / rewrite / internal link の関係を追いやすい

## 依存
- [24. tracked_keywords の pillar / cluster 拡張](./24-tracked-keywords-pillar-cluster-extension.md)
- [25. clusters 画面](./25-clusters-screen.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-17: `26` の方針として、cluster filter は discovery 系リストと候補抽出に適用し、`url` / `keyword` 直指定の詳細表示は維持したうえで tracked keyword の cluster context panel を併設する構成で着手。
- 2026-03-17: `keyword_*`, `page_candidates`, `rewrite_*`, `links_*`, `internal_link_event_*` の SQL / BigQuery 層を拡張し、`pillar / cluster` filter を受けて cluster 文脈の候補一覧、履歴、内部リンク課題だけを絞り込めるようにした。
- 2026-03-17: `/pages`, `/keywords`, `/rewrites`, `/links` に `pillar / cluster` filter、cluster context panel、filter を引き継ぐ drilldown link を追加し、`/keywords` には同 cluster の tracked query 表示、`/links` には被リンク不足ページ一覧を追加した。
- 2026-03-17: `/clusters` の drilldown を更新し、代表 URL / keyword に加えて `pillar / cluster` query も既存画面へ引き継ぐようにした。
- 2026-03-17: `.venv/bin/python -m unittest discover -s tests -p 'test_*.py'`, `npm run typecheck`, `npm run lint`, `npm run build` を実行し、通過を確認した。
