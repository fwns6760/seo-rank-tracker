# 06. daily_rankings への upsert と再取得制御

## 目的
GSC の取得結果を `daily_rankings` に冪等に保存し、直近 3 日の再取得運用を成立させる。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 GSC 取得データを `daily_rankings` のスキーマへ正規化する
- 【×】 BigQuery への upsert を `MERGE` または staging 経由で実装する
- 【×】 直近 3 日分を再取得する制御を入れる
- 【×】 `fetched_at` と `execution_id` を保存する
- 【×】 `source` 列で GSC 由来データを識別できるようにする
- 【×】 更新件数、挿入件数、スキップ件数をログ出力する
- 【×】 null と未取得を区別できる保存ルールを整理する

## TODO
- 【×】 GSC 取得データを `daily_rankings` のスキーマへ正規化する
- 【×】 BigQuery への upsert を `MERGE` または staging 経由で実装する
- 【×】 直近 3 日分を再取得する制御を入れる
- 【×】 `fetched_at` と `execution_id` を保存する
- 【×】 `source` 列で GSC 由来データを識別できるようにする
- 【×】 更新件数、挿入件数、スキップ件数をログ出力する
- 【×】 null と未取得を区別できる保存ルールを整理する

## 完了条件
- 同じ期間を複数回実行しても破綻しない
- 保存結果をログから追跡できる

## 依存
- [02. BigQuery テーブル設計と SQL 整備](./02-bigquery-schema-and-sql.md)
- [03. BigQuery 接続レイヤーとクエリ基盤](./03-bigquery-data-access-layer.md)
- [05. GSC 取得 Job 実装](./05-gsc-fetch-job.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `06` に着手。
- 2026-03-16: `jobs/fetch_gsc/bigquery_writer.py` を追加し、GSC 行を `daily_rankings` スキーマへ正規化して staging table 経由で `MERGE` する処理を実装。
- 2026-03-16: `sql/queries/merge_daily_rankings_from_stage.sql` と `sql/queries/count_existing_daily_rankings_from_stage.sql` を追加し、upsert SQL を `sql/` 配下へ分離。
- 2026-03-16: `fetch_gsc` Job に BigQuery upsert ステップを追加し、`fetched_rows`, `inserted_rows`, `updated_rows`, `skipped_rows`, `execution_id` をログと保存データへ反映。
- 2026-03-16: `--skip-bigquery-write` を追加し、取得のみの検証ルートと本番 upsert ルートを切り分けられるようにした。
- 2026-03-16: `python -m compileall jobs/fetch_gsc`, `python -m unittest discover -s tests/fetch_gsc -p 'test_*.py'`, `python -m jobs.fetch_gsc.main --skip-bigquery-write ...` を確認。
- 2026-03-16: 実 BigQuery への live merge は資格情報と外部接続が必要なため、この環境では未検証。正規化とジョブ分岐は単体テストと smoke run で確認。
