# WordPress / Cluster 運用ガイド

## 目的

`sync_wordpress_posts`, `tracked_keywords`, `rewrites`, `internal_link_events`, `/clusters` を一貫した運用フローで回し、記事単位と cluster 単位の両方で施策成果を追えるようにする。

## 1. WordPress 同期の前提

`sync_wordpress_posts` は WordPress REST API を前提にし、既定では次を使います。

- base URL: `WORDPRESS_BASE_URL`
- endpoint: `/wp-json/wp/v2/posts`
- statuses: `publish`
- auth mode: `none`

追加設定が必要なケース:

- custom post type を同期したい場合は `WORDPRESS_POST_TYPE`
- draft など publish 以外も取得したい場合は `WORDPRESS_POST_STATUSES`
- Basic 認証が必要な場合は `WORDPRESS_AUTH_MODE=basic`, `WORDPRESS_USERNAME`, `WORDPRESS_APPLICATION_PASSWORD`

`app_settings` に保存できるのは base URL, auth mode, username, Secret Manager 参照名, post type, statuses です。実パスワードは保存せず、Cloud Run Job またはローカル env に注入します。

## 2. `wp_posts` の運用ルール

`wp_posts` は WordPress 記事メタの canonical snapshot です。運用上は次を守ります。

- 記事 identity は `url` ではなく `wp_post_id` を基準に見る
- BigQuery の `wp_posts` を手修正せず、WordPress 側を直してから `sync_wordpress_posts` を再実行する
- URL, slug, post status, title を変えた後は、rewrite 登録や成果判定を見る前に同期を走らせる
- `rewrites` と `internal_link_events` の article-level 集計は current `wp_posts.url` を参照するため、同期が古いと join がずれる
- 同期は upsert のみで delete をしないため、trash / 削除記事の整理は別 runbook で扱う

主な保持項目:

- `wp_post_id`, `url`, `slug`, `title`, `post_type`, `post_status`
- `categories`, `tags`
- `published_at`, `modified_at`
- `content_hash`, `word_count`
- `fetched_at`, `execution_id`

## 3. `rewrites` と `internal_link_events` の使い分け

本文やタイトルの編集と、内部リンク導線の編集は別施策として管理します。

`rewrites` に入れるもの:

- タイトル変更
- リード修正
- 本文リフレッシュ
- 見出し構成の変更
- 記事全体の再編集

`internal_link_events` に入れるもの:

- 関連記事リンクの追加や削除
- アンカーテキストの見直し
- 記事内の導線整理
- 孤立ページの解消を狙ったリンク追加

登録ルール:

- 可能なら WordPress 記事を選択して `wp_post_id` を保存する
- 同じ日に同じ記事へ複数の細かな修正を入れた場合は、比較したい単位でまとめて 1 レコードにする
- 本文更新と内部リンク更新を同日に両方行った場合は、`rewrites` と `internal_link_events` の両方に分けて記録する
- sitewide なナビ変更のように単一記事へ帰属しにくい施策は、このアプリでは article-level 比較に載せづらい。対象記事を限定できる範囲で登録する

## 4. `tracked_keywords` と cluster 更新ルール

`tracked_keywords` は cluster 集計の source of truth です。`category` は既存運用ラベルとして残し、SEO 分析では `pillar / cluster / intent` を優先します。

各項目の役割:

- `pillar`: 複数 cluster を束ねる上位テーマ。大分類として長く使う
- `cluster`: 個別の検索ニーズや記事群を束ねる下位テーマ。`/clusters` の最小集計単位
- `intent`: `informational`, `commercial`, `transactional`, `navigational`, `mixed` のいずれか

更新ルール:

- 新しい keyword を追加するときは、まず既存 `pillar / cluster` に寄せられないか確認する
- cluster 名を rename, split, merge するときは、関連する `tracked_keywords` を同じ作業でまとめて更新する
- cluster を更新した後は `/clusters` と既存 drilldown 画面で表記が割れていないか確認する
- URL 変更を伴う記事は WordPress 同期を先に終えてから tracked keyword の `target_url` を更新する

命名ルール:

- `pillar` と `cluster` は人が読む表示名をそのまま保存する
- 同じテーマには必ず同じ表記を再利用する
- 大文字小文字違い、単複違い、和英混在などの表記ゆれを作らない
- 日付、施策名、キャンペーン名のような一時的な語を cluster 名に入れない
- `pillar` は広く安定、`cluster` は具体的で比較可能、を優先する

例:

- `pillar`: `family travel`
- `cluster`: `packing checklist`
- `cluster`: `hotel tips`

## 5. 日常運用フロー

1. WordPress 記事を追加、更新、URL 変更したら `sync_wordpress_posts` を実行する
2. `/settings` で該当 keyword と `target_url`, `pillar / cluster / intent` を更新する
3. 施策を入れたら、本文系は `/rewrites`、内部リンク系は `/links` または `/pages` から登録する
4. `/clusters` で高 impressions かつ平均順位が弱い cluster、rewrite が少ない cluster、内部リンク課題が多い cluster を探す
5. `/pages`, `/keywords`, `/rewrites`, `/links` に drilldown して具体的な URL, query, 施策履歴を確認する
6. 施策後は `7日` または `14日` の比較窓で結果を確認し、必要ならメモを追記する

## 6. 施策成果判定の見方

比較結果は `rewrites`, `pages`, `links` で見られます。

判定ラベルの意味:

- `positive`: 主要指標が概ね改善
- `negative`: 主要指標が概ね悪化
- `mixed`: 改善と悪化が混在
- `needs_review`: crawl 不足、比較窓不足、低 impressions などで要確認
- `insufficient_data`: before / after の観測値が不足

見る順番:

1. `/clusters` で cluster 単位の露出と課題量を見る
2. `/pages` または `/keywords` で URL / query の内訳を見る
3. `/rewrites` で本文系施策の前後比較を見る
4. `/links` で内部リンク施策と orphan / 404 / low inbound を確認する

注意点:

- rewrite 比較は `wp_post_id` と URL 履歴を束ねた article-level 集計
- internal link 比較は change_date 前後の比較窓で最も近い crawl snapshot を使う
- `needs_review` は失敗ではなく、判断材料が弱いシグナル
- URL 変更直後に WordPress 同期を省くと、current URL 解決が古いままになり結果を誤読しやすい

## 7. 既知の制約

- `pillar / cluster` は freeform 文字列で、rename の一括補助や master 管理はまだない
- `sync_wordpress_posts` は delete を扱わず、存在しなくなった記事のクリーンアップは別運用
- sitewide な内部リンク変更は article-level 比較にそのままは乗せにくい
- `internal_links` crawl が比較窓の前後で取れていない場合、内部リンク施策は `needs_review` になりやすい

## 8. 関連ドキュメント

- [README.md](../README.md)
- [docs/decisions.md](./decisions.md)
- [doc/19-sync-wordpress-posts-job.md](../doc/19-sync-wordpress-posts-job.md)
- [doc/23-impact-evaluation-logic.md](../doc/23-impact-evaluation-logic.md)
- [doc/25-clusters-screen.md](../doc/25-clusters-screen.md)
- [doc/26-cluster-integration-on-existing-screens.md](../doc/26-cluster-integration-on-existing-screens.md)
