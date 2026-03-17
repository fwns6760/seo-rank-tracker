# 27. WordPress / cluster 運用ドキュメント整備

## 目的
WordPress 同期とトピッククラスタ運用の手順を README と運用ドキュメントへ反映し、継続運用できる状態にする。

## 重要事項
- 【×】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【×】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【×】 このチケットで行った作業は都度 `作業ログ` に追記する

## TODO
- 【×】 WordPress REST API 前提と必要設定を README に追加する
- 【×】 `wp_posts` と `internal_link_events` の運用ルールを文書化する
- 【×】 cluster 更新ルールと naming ルールを文書化する
- 【×】 施策成果判定の見方を README または docs に追加する
- 【×】 既知の制約と今後の拡張項目を更新する

## 完了条件
- 新規メンバーでも WordPress 同期と cluster 運用を再現できる
- 施策成果の見方がドキュメントで追える

## 依存
- [19. sync_wordpress_posts Job](./19-sync-wordpress-posts-job.md)
- [23. 施策成果判定ロジック追加](./23-impact-evaluation-logic.md)
- [25. clusters 画面](./25-clusters-screen.md)
- [26. 既存画面の cluster 連携](./26-cluster-integration-on-existing-screens.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-17: チケット内容を確認し、README には要点を残しつつ、WordPress 同期前提、`wp_posts` / `internal_link_events` の運用ルール、cluster 更新手順、成果判定の読み方は専用運用ガイドへまとめる方針で着手。
- 2026-03-17: `README.md` に WordPress REST API 前提、日常運用フロー、施策成果判定ラベルの見方、既知の制約、今後の拡張項目を追記した。
- 2026-03-17: `docs/wordpress-cluster-operations.md` を追加し、`wp_posts`, `rewrites`, `internal_link_events`, `tracked_keywords`, `/clusters` を横断する運用ガイドを作成した。
- 2026-03-17: `docs/decisions.md` に cluster 命名ルールと WordPress URL 変更後の運用順序を記録し、`27` を完了扱いに更新した。
