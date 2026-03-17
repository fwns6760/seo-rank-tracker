# 09. keywords 画面

## 目的
キーワード単位で順位推移と対象 URL を追える分析画面を用意する。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 キーワード別順位推移グラフを実装する
- 【×】 対象 URL を表示する
- 【×】 GSC 平均順位を表示する
- 【×】 補助データとしてスクレイピング順位の表示枠を用意する
- 【×】 リライト実施日のマーカー表示に対応する
- 【×】 フィルタ状態を URL クエリで保持する
- 【×】 グラフ部分のみ Client Component として分離する

## TODO
- 【×】 キーワード別順位推移グラフを実装する
- 【×】 対象 URL を表示する
- 【×】 GSC 平均順位を表示する
- 【×】 補助データとしてスクレイピング順位の表示枠を用意する
- 【×】 リライト実施日のマーカー表示に対応する
- 【×】 フィルタ状態を URL クエリで保持する
- 【×】 グラフ部分のみ Client Component として分離する

## 完了条件
- 任意キーワードの時系列推移を確認できる
- リライト日との前後比較に使える画面になっている

## 依存
- [03. BigQuery 接続レイヤーとクエリ基盤](./03-bigquery-data-access-layer.md)
- [06. daily_rankings への upsert と再取得制御](./06-daily-rankings-upsert-and-backfill.md)
- [13. rewrites 機能](./13-rewrites-feature.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `09` に着手。
- 2026-03-16: `sql/queries/keyword_*.sql` を追加し、候補一覧、summary、日次 trend、target URL、rewrite marker の query を分離。
- 2026-03-16: `lib/bq/keywords.ts` と型定義を追加し、keywords 画面専用の集計呼び出しを `lib/` 配下へ集約。
- 2026-03-16: `components/keyword-trend-chart.tsx` を追加し、GSC 平均順位、スクレイピング順位、rewrite marker を表示する Client Component を実装。
- 2026-03-16: `app/keywords/page.tsx` を全面更新し、URL クエリ保持の keyword / url / days フィルタ、候補キーワード、summary カード、target URL 一覧、rewrite marker 一覧を実装。
- 2026-03-16: `rewrites` は read-only 参照で先行連携し、登録データがない場合は空表示にする判断を `docs/decisions.md` に記録。
- 2026-03-16: `npm install recharts`, `npm run typecheck`, `npm run lint`, `npm run build` を実行し、通過を確認。
