# 13. rewrites 機能

## 目的
リライト履歴を登録し、施策前後の比較と候補抽出へつなげる。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 `rewrites` テーブルを利用したデータ登録フローを作る
- 【×】 リライト履歴登録 UI を実装する
- 【×】 `rewrite_type` `rewrite_date` `summary` `memo` を登録できるようにする
- 【×】 URL ごとのリライト履歴一覧を表示する
- 【×】 リライト前後比較の基礎集計を実装する
- 【×】 リライト候補自動抽出の条件を定義する
- 【×】 keywords / pages 画面から履歴を参照できるようにする

## TODO
- 【×】 `rewrites` テーブルを利用したデータ登録フローを作る
- 【×】 リライト履歴登録 UI を実装する
- 【×】 `rewrite_type` `rewrite_date` `summary` `memo` を登録できるようにする
- 【×】 URL ごとのリライト履歴一覧を表示する
- 【×】 リライト前後比較の基礎集計を実装する
- 【×】 リライト候補自動抽出の条件を定義する
- 【×】 keywords / pages 画面から履歴を参照できるようにする

## 完了条件
- リライト実施日と順位変動を結び付けて確認できる
- Phase 2 の比較機能へ進める基盤が整っている

## 依存
- [02. BigQuery テーブル設計と SQL 整備](./02-bigquery-schema-and-sql.md)
- [03. BigQuery 接続レイヤーとクエリ基盤](./03-bigquery-data-access-layer.md)
- [08. dashboard 画面](./08-dashboard-screen.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `13` に着手。
- 2026-03-16: `sql/queries/insert_rewrite.sql`, `rewrite_history.sql`, `rewrite_before_after_comparison.sql`, `rewrite_opportunity_candidates.sql` を追加し、登録、履歴、前後比較、候補抽出の SQL を分離。
- 2026-03-16: `lib/validators/rewrites.ts` を追加し、URL、日付、`rewrite_type`、summary、memo の正規化と検証を実装。
- 2026-03-16: `lib/bq/rewrites.ts` と関連型定義を追加し、履歴取得、前後比較、候補抽出、BigQuery 登録処理を `lib/` 配下へ集約。
- 2026-03-16: `app/api/rewrites/route.ts` を追加し、`rewrites` 登録 API と構造化ログ出力を実装。
- 2026-03-16: `components/rewrite-registration-form.tsx` と `app/rewrites/page.tsx` を実装し、登録フォーム、履歴一覧、前後比較、候補抽出をまとめた rewrites 画面を追加。
- 2026-03-16: `app/keywords/page.tsx` と `app/pages/page.tsx` を更新し、rewrite 表示箇所から `/rewrites` へ遷移できる導線を追加。
- 2026-03-16: `rewrite_type` は freeform 保存で UI はプリセット + custom、前後比較窓は 7 日、候補抽出条件は impressions 500 以上 / 平均順位 6-20 / CTR 3% 以下 / 30 日 cooldown とする判断を `docs/decisions.md` に記録。
- 2026-03-16: `npm run build`, `npm run typecheck`, `npm run lint`, `python3 -m compileall jobs/fetch_gsc` を実行し、通過を確認。
- 2026-03-17: `app/api/rewrites/route.ts` の logger 初期化を env 検証より先に移し、設定漏れでも構造化ログが残るよう補正した。JSON 構文エラーも validation error として `400` を返すようにした。
