# 05. GSC 取得 Job 実装

## 目的
Google Search Console API から日次データを取得する Python Job を実装する。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 `jobs/fetch_gsc/` に Python Job の雛形を作る
- 【×】 Google Search Console API の認証処理を実装する
- 【×】 取得粒度を `date`, `page`, `query` に固定する
- 【×】 取得指標を `clicks`, `impressions`, `ctr`, `position` に固定する
- 【×】 `prosports.yoshilover.com` に絞るフィルタ条件を整理する
- 【×】 取得失敗時に処理全体を止めずログへ残す設計にする
- 【×】 主要関数へ docstring を付ける

## TODO
- 【×】 `jobs/fetch_gsc/` に Python Job の雛形を作る
- 【×】 Google Search Console API の認証処理を実装する
- 【×】 取得粒度を `date`, `page`, `query` に固定する
- 【×】 取得指標を `clicks`, `impressions`, `ctr`, `position` に固定する
- 【×】 `prosports.yoshilover.com` に絞るフィルタ条件を整理する
- 【×】 取得失敗時に処理全体を止めずログへ残す設計にする
- 【×】 主要関数へ docstring を付ける

## 完了条件
- Job 単体で GSC データを取得できる
- 取得件数と失敗内容を構造化ログに残せる

## 依存
- [03. BigQuery 接続レイヤーとクエリ基盤](./03-bigquery-data-access-layer.md)
- [04. 構造化ログと execution_id 基盤](./04-structured-logging-and-execution-id.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `05` に着手。
- 2026-03-16: `jobs/fetch_gsc/` に Python Job の設定パーサー、GSC クライアント、構造化ロガー、CLI エントリポイント、モデル定義を追加。
- 2026-03-16: GSC 取得は `date`, `page`, `query` 固定、指標は `clicks`, `impressions`, `ctr`, `position` 固定で、`prosports.yoshilover.com` に絞るフィルタを実装。
- 2026-03-16: 日単位の fetch に分解し、1 日失敗しても warning ログを残して残りを継続する構成にした。
- 2026-03-16: `.venv` に依存を導入し、`python -m compileall jobs/fetch_gsc`, `python -m unittest discover -s tests/fetch_gsc -p 'test_*.py'`, `python -m jobs.fetch_gsc.main --help` を確認。
- 2026-03-16: 認証・ネットワーク未接続環境での実行により、recoverable error が構造化ログへ出ることを確認。実 GSC への成功取得は認証情報と外部接続が必要。
