# 24. tracked_keywords の pillar / cluster 拡張

## 目的
監視キーワードにピラー、トピッククラスタ、検索意図を持たせ、クラスタ単位分析の基礎データを作る。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## TODO
- 【×】 `tracked_keywords` に `pillar`, `cluster`, `intent` 追加を検討する
- 【×】 migration と validation を追加する
- 【×】 `/settings` で編集できるようにする
- 【×】 既存 `category` との役割分担を整理する
- 【×】 filter と一覧表示に `pillar` / `cluster` を追加する

## 完了条件
- 監視キーワードをクラスタ単位で管理できる
- 後続画面が `pillar` / `cluster` 単位で集計できる

## 依存
- [15. settings と tracked_keywords 管理](./15-settings-and-tracked-keywords.md)
- [20. settings に WordPress 接続設定追加](./20-wordpress-connection-settings.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-17: `sql/migrations/0009_add_cluster_fields_to_tracked_keywords.sql`、`lib/validators/settings.ts`、`app/settings/page.tsx`、`components/tracked-keyword-form.tsx` を確認し、`pillar / cluster / intent` の schema、validation、編集 UI、filter/list 反映が実装済みであることを確認した。
- 2026-03-17: `category` は既存運用ラベル、`pillar / cluster / intent` は SEO 用トピック構造として分離する方針を `docs/decisions.md` と `/settings` 補助文言に反映済みであることを確認し、チケットを完了扱いに更新した。
