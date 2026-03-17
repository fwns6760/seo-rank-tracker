# Decisions

## 2026-03-16

### チケット配置先の扱い
- 背景: `AGENTS.md` では判断ログを `docs/decisions.md` に残す指示がある一方、今回の依頼ではチケットの配置先として `/doc` が指定されている。
- 判断: 進捗管理用チケットは `doc/` 配下に作成し、仕様差分や判断ログは `docs/decisions.md` に残す。
- 理由: ユーザー指定の配置先を優先しつつ、`AGENTS.md` の運用ルールも満たすため。

### 環境変数テンプレートの扱い
- 背景: 要件には `.env.local` を管理対象とする指示があるが、機密値を含む実ファイルをコミットする運用は避けたい。
- 判断: リポジトリには `.env.local.example` を置き、実運用値は各開発環境の `.env.local` と Secret Manager で管理する。
- 理由: ローカルセットアップの再現性を保ちつつ、認証情報の誤コミットを防ぐため。

### Next.js build の扱い
- 背景: `next build` の既定動作では Turbopack が使われ、現行の作業環境では CSS 処理時に sandbox 制約へ当たりビルドに失敗した。
- 判断: プロジェクトの `build` スクリプトは当面 `next build --webpack` を使う。
- 理由: App Router の静的ビルド検証を安定して通し、ローカル開発と CI の再現性を優先するため。

### dashboard ルートの描画方式
- 背景: `dashboard` は BigQuery 集計と URL フィルタに依存する運用画面であり、静的 prerender させると build 時にデータ取得が走って不安定になる。
- 判断: `app/dashboard/page.tsx` は `force-dynamic` とし、実行時レンダリングで扱う。
- 理由: 本番データに依存する管理画面としての性質に合わせ、build の安定性と実行時の最新性を優先するため。

### keywords ルートの rewrite marker 連携
- 背景: `keywords` 画面では rewrite marker 表示が必要だが、rewrite 登録 UI を扱う `13` はまだ未着手。
- 判断: `keywords` 画面は先に `rewrites` テーブルを read-only 参照し、データがあれば marker を表示、なければ空表示とする。
- 理由: 画面要件を先に満たしつつ、登録導線の実装は `13` に分離するため。

### pages ルートの rewrites / internal_links 連携
- 背景: `pages` 画面ではリライト履歴と内部リンク状況の表示が必要だが、登録と収集の本実装を扱う `13` と `14` はまだ未着手。
- 判断: `app/pages/page.tsx` は先に `rewrites` と `internal_links` を read-only 参照し、データ未整備または参照失敗時は warning / empty state を表示して画面全体は継続表示する。
- 理由: Phase 1 のページ分析画面を先に成立させつつ、後続チケットでデータ投入経路を追加できるようにするため。

### fetch_gsc の Cloud Run 起動方式
- 背景: `fetch_gsc` はローカル手動実行と Cloud Run Jobs の両方から起動するため、入口が分かれると引数仕様や実行差分が増えやすい。
- 判断: `scripts/run-fetch-gsc.sh` を共通 launcher とし、ローカルの manual run と Cloud Run コンテナの entrypoint の両方から同じ `python -m jobs.fetch_gsc.main` を呼び出す。
- 理由: 引数設計と起動手順を一箇所に寄せ、ローカル検証と本番実行の差分を最小化するため。

### Cloud Scheduler の実行時刻と再実行方針
- 背景: `fetch_gsc` の定期実行では日次 cadence を保ちつつ、GSC の遅延データと失敗時の再実行コストを両立する必要がある。
- 判断: Cloud Scheduler の既定値は `Asia/Tokyo` の毎日 `06:00` とし、Scheduler 側の retry は `0`、Cloud Run Job 側の task retry は `1` を使う。
- 理由: job 自体が trailing `3` 日の再取得 upsert を行うため次回実行でも補完でき、Scheduler 側で自動再試行を増やすより重複実行を抑えたほうが運用上扱いやすいため。

### rewrites の `rewrite_type` 入力方式
- 背景: 要件では `rewrite_type` の登録が必要だが、許容値の厳密な enum は定義されていない。
- 判断: 保存時の `rewrite_type` は freeform string のまま扱い、UI では推奨プリセットを出しつつ `custom` 入力も許可する。
- 理由: 初期運用では入力体験を揃えつつ、今後の施策種別追加で schema や UI を作り直さずに済むようにするため。

### rewrites の前後比較窓と候補抽出条件
- 背景: Phase 2 の比較機能へつなぐには、まず比較窓と候補抽出条件を暫定でも固定して UI に載せる必要がある。
- 判断: 前後比較は rewrite 当日を除いた前後 `7` 日で行い、候補抽出は「直近 30 日で impressions 500 以上、平均順位 6-20、CTR 3% 以下、かつ直近 30 日に rewrite がない URL」を既定条件にする。
- 理由: 早すぎる上位記事や露出不足の下位記事を除外しつつ、改善余地が大きく再施策の重複も少ない URL を優先表示できるため。

### internal_links crawler の開始 URL
- 背景: 内部リンク crawl は開始点が未指定だと挙動が曖昧になり、毎回引数を必須にすると運用が重くなる。
- 判断: `crawl_internal_links` の開始 URL は既定で `https://${TARGET_SITE_HOST}/` とし、必要な場合だけ `--start-url` または `INTERNAL_LINKS_START_URL` で上書きする。
- 理由: `prosports.yoshilover.com` ではトップから同一ホストを BFS で辿る運用が素直で、定期実行時の設定量も減らせるため。

### internal_links の orphan 定義
- 背景: 「孤立ページ」は crawl 対象だけでなく、監視対象ページ全体を基準に判定しないと改善優先度に使いにくい。
- 判断: orphan は「最新 internal_links crawl に被リンクがなく、かつ直近期間の `daily_rankings` に存在する URL」と定義し、crawl 未実行時は orphan 判定を出さない。
- 理由: 実際に検索流入監視している URL 群を基準にしつつ、crawl データ未取得を誤って孤立扱いしないため。

### settings の永続化テーブル
- 背景: 要件には `tracked_keywords` と運用閾値、Slack Webhook、実行時刻、対象サイト設定の管理が含まれるが、永続化先として `tracked_keywords` 以外の設定保存先は定義されていない。
- 判断: `tracked_keywords` とは別に `app_settings` テーブルを追加し、閾値、Slack Webhook、実行時刻、対象サイト設定を key-value で保持する。
- 理由: 運用設定を画面から更新できるようにしつつ、設定項目追加時に schema 変更コストを最小化するため。

### settings と既存 Job の設定ソース
- 背景: 既存の `fetch_gsc` や `crawl_internal_links` は環境変数を基準に実装済みで、ここで即座に `app_settings` 参照へ切り替えると運用経路が広く変わる。
- 判断: `15` 時点では `/settings` 画面と API で `tracked_keywords` / `app_settings` を保存できる状態まで実装し、既存 Job は当面 env を参照したままにする。後続の alert / notification 系チケットで `app_settings` を control plane として読み込む。
- 理由: Phase 1 までに作った安定経路を壊さず、設定 UI と Job 側の切り替えを段階的に進めるため。

### tracked_keywords の更新キー
- 背景: tracked keyword は編集時に `keyword` や `target_url` 自体が変わる可能性があり、単一列だけでは既存行の特定が不安定になる。
- 判断: `tracked_keywords` の upsert は `keyword + target_url` を論理キーとし、編集時は `original_keyword` と `original_target_url` を受け取って既存行を特定する。
- 理由: keyword と URL の組み合わせ単位で監視対象を管理し、編集時の上書き先を明示できるようにするため。

### alert 判定の基準窓
- 背景: 順位変動アラートと index 異常通知は、短期ノイズを拾いすぎず、しかも発見が遅れない判定窓を固定する必要がある。
- 判断: rank drop / rise は active な `tracked_keywords` に限定し、直近 `7` 日窓で最新値と直前値を比較する。index anomaly は active な `tracked_keywords` のうち、直近 `3` 日にデータがなく、かつその前 `30` 日に impressions 実績がある組み合わせを対象にする。
- 理由: 通常の日次変動は許容しつつ、追うべきキーワードだけを対象にして誤検知を抑えたい一方、消失系の異常は早めに拾いたいため。

### alert 通知の起動経路
- 背景: 既存実装には alert 専用 Job がなく、まずは dashboard と同じ判定ロジックを使って Slack 通知を送れる共通経路が必要だった。
- 判断: `16` では `/api/alerts/dispatch` を Node runtime の通知入口として追加し、dashboard と同じ alert 集約ロジックを使って Slack Webhook へ送信する。通知本文には必ず `execution_id` を含める。
- 理由: UI 表示と通知判定のズレを防ぎつつ、後続で Scheduler や外部実行基盤から呼び出しやすい HTTP 入口を先に整えるため。

### wp_posts の論理キーと物理設計
- 背景: WordPress 記事メタは URL 変更や slug 変更が起こり得る一方、後続チケットでは `url` と `wp_post_id` の両方で join したい。
- 判断: `wp_posts` の論理キーは安定している `wp_post_id` とし、BigQuery 物理設計は `DATE(fetched_at)` パーティション、`wp_post_id`, `url`, `post_status` クラスタとする。
- 理由: 記事 identity は WordPress 側の ID で安定させつつ、運用上多い URL join と公開状態フィルタ、同期 freshness の確認を両立するため。

### wp_posts の taxonomy 保持形式
- 背景: 後続の cluster 分析や画面表示ではカテゴリ / タグをそのまま人が読める形で扱いたい。
- 判断: `wp_posts` の `categories` と `tags` は WordPress taxonomy ID ではなく表示名の `ARRAY<STRING>` で保持する。
- 理由: BigQuery / UI 側で毎回 taxonomy master を join せずに、人間が読める記事分類として即利用できるようにするため。

### sync_wordpress_posts の認証方式と既定同期範囲
- 背景: WordPress REST API は公開記事なら無認証でも取得できる一方、将来は非公開環境や保護された endpoint も想定される。
- 判断: `sync_wordpress_posts` は既定で無認証の public REST API を使い、`WORDPRESS_USERNAME` と `WORDPRESS_APPLICATION_PASSWORD` が両方ある場合のみ Basic Auth を有効にする。同期対象の既定値は `posts` endpoint と `publish` status とする。
- 理由: 現在の `prosports.yoshilover.com` は公開記事同期が目的であり、初期設定を最小化しつつ、必要になった時だけ WordPress application password で拡張できるようにするため。

### 対象サブドメインの補正
- 背景: 初期チケットと一部 UI / README では `family.yoshilover.com` を例示していたが、実運用対象のサブドメインは `prosports.yoshilover.com` だった。
- 判断: host 例、placeholder、deploy 例、テスト fixture は `prosports.yoshilover.com` を正とし、GSC property の既定例も実環境で権限が付いている `https://prosports.yoshilover.com/` に揃える。
- 理由: 実運用の Search Console property と WordPress base URL に合わせないと、deploy 手順と UI 補助文言が誤った host を誘導してしまうため。

### sync_wordpress_posts の taxonomy 未解決 ID の扱い
- 背景: WordPress 側の taxonomy 参照に揺れや欠損があると、同期全体を失敗にせず後続の調査手掛かりも残したい。
- 判断: taxonomy master に存在しない term ID は破棄せず、`category:<id>` または `tag:<id>` の文字列として `wp_posts` に残す。
- 理由: 記事同期の完走を優先しつつ、WordPress 側の taxonomy 不整合を BigQuery と UI 上で追跡できるようにするため。

### sync_wordpress_posts の settings 参照優先順位
- 背景: `/settings` に WordPress 接続設定を追加しただけでは、同期 Job がそれを参照できず運用上の一貫性が取れない。
- 判断: `sync_wordpress_posts` の WordPress 平文設定は `CLI 引数 > env > BigQuery app_settings` の優先順位で解決し、`WORDPRESS_APPLICATION_PASSWORD` だけは引き続き Secret Manager 注入の env で受け取る。
- 理由: ローカル smoke run や一時 override は維持しつつ、平常運用では UI 管理の設定を既定値として使え、機密値だけは平文保存しない構成にできるため。

### rewrites と WordPress 記事の紐付け方式
- 背景: rewrite 履歴を URL だけで持つと、slug 変更や canonical URL 変更が起きたときに同一記事として追いにくい。
- 判断: `rewrites` には URL snapshot を残したまま nullable の `wp_post_id` を追加し、新規登録は WordPress 記事選択時に `wp_post_id` を保存する。既存行は migration `0007` で current URL 一致ベースの best-effort backfill を行う。
- 理由: 過去時点の URL で前後比較できる履歴性を保ちつつ、将来の URL 変更後も同一記事として `/rewrites` と `/pages` で追跡しやすくするため。

### internal_link_events の分離方針
- 背景: 内部リンク改善も施策履歴として持ちたいが、`rewrites` に混ぜると本文更新とリンク調整の影響を運用上切り分けにくくなる。
- 判断: 内部リンク施策は `internal_link_events` として独立テーブルに保存し、schema は `rewrites` と同じく URL snapshot + nullable `wp_post_id` を持たせる。`/links` と `/pages` から登録できるようにし、本文やタイトル変更は引き続き `rewrites` に分ける。
- 理由: 記事 identity は後から安定して追いつつ、施策種別ごとの比較や運用ルールを混同せず維持するため。

### 施策成果判定の比較窓と article-level 集計
- 背景: `rewrites` と `internal_link_events` の効果判定は、URL 変更をまたぐ記事と snapshot ベースの `internal_links` を同時に扱う必要がある。
- 判断: 成果判定の比較窓は画面から `7日` または `14日` を選べるようにし、`wp_post_id` を持つ施策は「現在の `wp_posts.url` + 同一記事に紐づく履歴 URL」を束ねて article-level に `daily_rankings` / `internal_links` を集計する。内部リンク施策の link count 比較は change_date 前後の比較窓内で最も近い crawl snapshot を使う。
- 理由: slug 変更後も同一記事として前後比較でき、かつ crawl が日次でない `internal_links` でも運用上意味のある before / after を一貫して出せるため。

### 施策成果判定ラベルの付け方
- 背景: 前後比較を数値だけで出すと、改善・悪化・誤検知候補の切り分けに時間がかかる。
- 判断: `rewrites` は順位、クリック、impressions、CTR、`internal_link_events` はそれに加えて内部リンク総数差分と broken link 差分を score 化し、`positive`, `negative`, `mixed`, `needs_review`, `insufficient_data` のラベルを返す。比較窓の日数不足、低 impressions、比較対象 crawl 不足は `evaluation_notes` として UI に表示する。
- 理由: 一次判定を UI 上ですぐ見られるようにしつつ、ノイズが大きいケースは「要確認」と理由を同時に出して過信を防ぐため。

## 2026-03-17

### clusters 画面の集計単位
- 背景: `25` では cluster 単位の成果画面が必要だが、未分類 keyword を含めるか、rewrite と内部リンク課題をどの粒度で数えるかが要件に明記されていない。
- 判断: `/clusters` は active かつ `cluster` が入っている `tracked_keywords` だけを対象にする。rewrite 件数は `wp_post_id` 優先の article-level key で数え、内部リンク課題数は選択期間内の最新 crawl において「cluster の current target URL が orphan である、または 404 link の source / target になっている」ページ数とする。
- 理由: cluster 画面は分類済みテーマの優先度判断に集中させたい一方、URL 変更後も rewrite 履歴を記事単位で拾い、リンク改善課題は現在の導線メンテナンス対象として読めるようにしたいため。

### clusters 画面の drilldown 導線
- 背景: `25` では `/pages`, `/keywords`, `/rewrites`, `/links` への導線が必要だが、既存画面に cluster filter を足す本実装は `26` で扱う。
- 判断: `/clusters` では cluster 内で直近期間の impressions が最大の URL と keyword を代表値として選び、各既存画面へ prefilled query 付きで遷移させる。
- 理由: `25` 単体でも cluster から個別画面へ掘れる状態を先に作りつつ、広い cluster filter 連携は `26` に分離して段階的に進めるため。

### 既存画面の cluster filter の効かせ方
- 背景: `26` では `pages`, `keywords`, `rewrites`, `links` に cluster 文脈を通したいが、`url` や `keyword` を明示指定した deep link まで filter で空にすると運用上扱いづらい。
- 判断: cluster filter は discovery 系の候補リスト、rewrite / internal link の一覧、候補抽出に適用し、`url` / `keyword` を明示指定した詳細表示は維持する。画面内では別途 tracked keyword の cluster context panel を出し、cluster 文脈を見失わないようにする。
- 理由: deep link の安定性を保ちつつ、日常の探索や候補抽出は cluster 単位に絞り込めるようにしたほうが実運用で扱いやすいため。

### 被リンク不足ページの定義
- 背景: `26` の `/links` では cluster ごとの「被リンク不足」を出したいが、0 本は orphan と重複し、しきい値も未定義だった。
- 判断: `/links` の被リンク不足ページは、選択期間内の最新 crawl で inbound link が `1-2` 本の tracked URL と定義する。`0` 本は引き続き orphan として別表示する。
- 理由: orphan と薄い被リンク状態を分けて優先順位を見たく、かつ 1-2 本なら改善余地として十分に弱い導線とみなせるため。

### cluster 命名と更新の運用ルール
- 背景: `27` では WordPress 同期と cluster 運用の手順を文書化する必要があるが、現行 schema の `pillar` / `cluster` は freeform 文字列で master や slug を持っていない。
- 判断: `pillar` と `cluster` は人が読む表示名を `tracked_keywords` にそのまま保存し、同じテーマでは必ず同一表記を再利用する。`pillar` は広く安定した上位テーマ、`cluster` はその配下の具体テーマとし、rename / split / merge 時は関連する tracked keyword を同じ作業でまとめて更新する。
- 理由: `/clusters` と既存画面の cluster filter は文字列一致ベースで集計されるため、表記ゆれや部分的な rename を残すと成果と課題が分散してしまうため。

### WordPress URL 変更後の運用順序
- 背景: article-level の rewrite / internal link 比較は `wp_post_id` に加えて current `wp_posts.url` を参照するため、WordPress 側の URL や slug 変更が同期されていないと比較結果が古い URL に引きずられる。
- 判断: WordPress の URL, slug, post status を変更した場合は、`tracked_keywords` の更新や新規 `rewrites` / `internal_link_events` 登録、成果判定の確認より先に `sync_wordpress_posts` を再実行する。
- 理由: `wp_posts` を最新化してから運用テーブルと画面を見るほうが、article-level join の整合性が保たれ、URL 変更直後の誤読を減らせるため。

### Cloud Run Service 上の manual run 実行方式
- 背景: dashboard の manual run は当初ローカル process で Python Job を spawn する想定だったが、Cloud Run Service に Web アプリを載せる場合は Python runtime や instance-local メモリに依存した実装をそのまま使いづらい。
- 判断: `/api/manual-runs` は `MANUAL_RUN_MODE=cloud_run_job` のとき Cloud Run Job API 経由で `fetch_gsc` を実行し、dashboard 上では local stdout / stderr tail の代わりに Cloud Run execution 状態を追跡する。
- 理由: Web Service と Job を責務分離したまま本番の手動実行導線を維持でき、Cloud Run 上で Python process を直接抱え込まずに済むため。
