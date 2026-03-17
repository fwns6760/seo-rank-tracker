# 25. clusters 画面

## 目的
トピッククラスタ単位で成果を見られる `/clusters` 画面を追加し、優先的に改善すべきテーマを見つけやすくする。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## TODO
- 【×】 `/clusters` 画面を追加する
- 【×】 cluster ごとの対象記事数、対象キーワード数、impressions、clicks、平均順位を表示する
- 【×】 cluster ごとの rewrite 件数と内部リンク課題数を表示する
- 【×】 `pillar`, `cluster`, `intent` フィルタを追加する
- 【×】 `/pages`, `/keywords`, `/rewrites`, `/links` への導線を追加する

## 完了条件
- cluster 単位の成果を一画面で把握できる
- 優先改善クラスタを発見しやすい

## 依存
- [23. 施策成果判定ロジック追加](./23-impact-evaluation-logic.md)
- [24. tracked_keywords の pillar / cluster 拡張](./24-tracked-keywords-pillar-cluster-extension.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-17: チケット内容を確認し、cluster 画面は active かつ `cluster` が設定された tracked keyword を対象にし、rewrite は article-level、内部リンク課題は最新 crawl 上の orphan / 404 接触 URL 数として数える方針で着手。
- 2026-03-17: `sql/queries/cluster_overview.sql` と `lib/bq/clusters.ts` を追加し、cluster ごとの keyword 数、対象 URL 数、impressions、clicks、CTR、平均順位、rewrite 件数、orphan / broken / issue ページ数を返す集計を実装した。
- 2026-03-17: `app/clusters/page.tsx` を追加し、`pillar / cluster / intent / window` filter、cluster カード一覧、既存 `/pages`, `/keywords`, `/rewrites`, `/links` への代表 URL / keyword ベースの drilldown 導線を実装した。
- 2026-03-17: `components/app-shell.tsx` と `README.md` を更新し、`/clusters` へのナビゲーションとルート一覧を追加した。
- 2026-03-17: `.venv/bin/python -m unittest discover -s tests -p 'test_*.py'`, `npm run typecheck`, `npm run lint`, `npm run build` を実行し、`/clusters` を含めて通過を確認した。
