# 16. アラートと通知基盤

## 目的
順位急変とインデックス異常を検知し、通知へつなげる基盤を作る。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 順位急落アラートの判定条件を定義する
- 【×】 順位急上昇アラートの判定条件を定義する
- 【×】 インデックス異常通知の検知条件を定義する
- 【×】 dashboard に変動アラート一覧を表示する
- 【×】 Slack 通知の送信処理を実装する
- 【×】 通知内容に `execution_id` を含める
- 【×】 誤検知を避けるためのしきい値設定連携を行う

## TODO
- 【×】 順位急落アラートの判定条件を定義する
- 【×】 順位急上昇アラートの判定条件を定義する
- 【×】 インデックス異常通知の検知条件を定義する
- 【×】 dashboard に変動アラート一覧を表示する
- 【×】 Slack 通知の送信処理を実装する
- 【×】 通知内容に `execution_id` を含める
- 【×】 誤検知を避けるためのしきい値設定連携を行う

## 完了条件
- 重要な順位変動を自動で拾える
- 通知からログ追跡へつなげられる

## 依存
- [04. 構造化ログと execution_id 基盤](./04-structured-logging-and-execution-id.md)
- [08. dashboard 画面](./08-dashboard-screen.md)
- [15. settings と tracked_keywords 管理](./15-settings-and-tracked-keywords.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `16` に着手。
- 2026-03-16: `sql/queries/alert_rank_movements.sql`, `alert_index_anomalies.sql` を追加し、active な `tracked_keywords` と `app_settings` の閾値を前提に rank drop / rise と index anomaly を検出する SQL を実装。
- 2026-03-16: `lib/alerts/service.ts`, `lib/alerts/slack.ts` を追加し、dashboard 表示と Slack 通知で共通利用する alert 集約ロジックと webhook payload 生成処理を実装。
- 2026-03-16: `app/api/alerts/dispatch/route.ts` を追加し、Slack Webhook への通知送信、`execution_id` 付き構造化ログ出力、未設定時の skip 制御を実装。
- 2026-03-16: `components/alert-dispatch-panel.tsx` と `app/dashboard/page.tsx` を更新し、dashboard 上で rank drop / rise / index anomaly を一覧表示し、手動で Slack 通知を送れる導線を追加。
- 2026-03-16: rank movement は直近 `7` 日比較、index anomaly は「直近 `3` 日データなし + その前 `30` 日に impressions 実績あり」、通知入口は `/api/alerts/dispatch` とする判断を `docs/decisions.md` に記録。
- 2026-03-16: `npm run build`, `npm run typecheck`, `npm run lint` を実行し、通過を確認。
- 2026-03-17: `app/api/alerts/dispatch/route.ts` の logger 初期化を env 検証より先に移し、設定不足でも alert dispatch failure を構造化ログで追えるよう補正した。
