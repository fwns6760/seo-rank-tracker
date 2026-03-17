# 20. settings に WordPress 接続設定追加

## 目的
WordPress 接続先と同期に必要な設定を `/settings` から管理できるようにする。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 `app_settings` に WordPress 接続設定キーを追加する
- 【×】 `/settings` の運用設定フォームに WordPress 接続項目を追加する
- 【×】 認証情報の保持方針を validation と補助文言へ反映する
- 【×】 Secret Manager を使う項目と平文設定項目を分ける

## TODO
- 【×】 `WORDPRESS_BASE_URL` 相当の設定項目を追加する
- 【×】 認証情報の保持方針を整理する
- 【×】 app_settings または別保存先への反映を決める
- 【×】 `/settings` に入力欄と validation を追加する
- 【×】 Secret Manager を使う項目と平文設定項目を分ける

## 完了条件
- WordPress 同期 Job が参照する接続設定を UI から管理できる
- 危険な認証情報をコードへ直書きしない

## 依存
- [15. settings と tracked_keywords 管理](./15-settings-and-tracked-keywords.md)
- [19. sync_wordpress_posts Job](./19-sync-wordpress-posts-job.md)

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `20` に着手。
- 2026-03-16: `app_settings` の WordPress 設定キーと `/settings` の入力フォーム、validation、補助文言を確認し、平文設定と Secret Manager 参照名の分離が実装済みであることを確認。
- 2026-03-16: `jobs/sync_wordpress_posts` に BigQuery `app_settings` fallback を追加し、WordPress 接続設定の優先順位を `CLI 引数 > env > app_settings` に統一。実パスワードは `WORDPRESS_APPLICATION_PASSWORD` の env 注入を継続する判断を `docs/decisions.md` に追記。
- 2026-03-16: `.env.local.example`, `README.md`, `components/app-settings-form.tsx` を更新し、WordPress 設定の実行優先順位と Secret Manager 前提の認証情報保持方針を明記。
- 2026-03-16: `.venv/bin/python -m unittest discover -s tests/sync_wordpress_posts -p 'test_*.py'`, `.venv/bin/python -m unittest discover -s tests/fetch_gsc -p 'test_*.py'`, `.venv/bin/python -m unittest discover -s tests/crawl_internal_links -p 'test_*.py'`, `npm run typecheck`, `npm run lint`, `npm run build` を実行し、通過を確認。
