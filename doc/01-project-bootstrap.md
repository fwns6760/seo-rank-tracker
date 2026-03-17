# 01. プロジェクト基盤セットアップ

## 目的
Next.js App Router を中心に、Phase 1 開発を始められる最低限の土台を整える。

## 重要事項
- 【】 作業を始める前に必ず本チケットを確認し、今回の作業箇所をチェックしてから着手する
- 【】 チケットは原則として番号順に進める。順番を変更する場合は理由を作業ログに残す
- 【】 このチケットで行った作業は都度 `作業ログ` に追記する

## 今回の作業箇所
- 【×】 Next.js App Router プロジェクトを初期化する
- 【×】 TypeScript と ESLint の基本設定を整える
- 【×】 Tailwind CSS を導入し、共通スタイルの土台を作る
- 【×】 shadcn/ui の初期セットアップを行う
- 【×】 `app/` `components/` `lib/` `jobs/` `sql/` `tests/` の基本構成を用意する
- 【×】 Server Components 優先、Client Components 分離方針をドキュメント化する
- 【×】 `.env.local` の雛形と必須環境変数の一覧を整理する

## TODO
- 【×】 Next.js App Router プロジェクトを初期化する
- 【×】 TypeScript と ESLint の基本設定を整える
- 【×】 Tailwind CSS を導入し、共通スタイルの土台を作る
- 【×】 shadcn/ui の初期セットアップを行う
- 【×】 `app/` `components/` `lib/` `jobs/` `sql/` `tests/` の基本構成を用意する
- 【×】 Server Components 優先、Client Components 分離方針をドキュメント化する
- 【×】 `.env.local` の雛形と必須環境変数の一覧を整理する

## 完了条件
- ローカルでアプリが起動できる
- UI 実装を始められるディレクトリ構成が揃っている

## 依存
- なし

## 作業ログ
- 2026-03-16: チケット作成。
- 2026-03-16: 重要事項と作業ログ運用を追加。
- 2026-03-16: チケット内容を確認し、今回の作業箇所をチェックしたうえで `01` に着手。
- 2026-03-16: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui 初期設定、各種ルート雛形、共通 UI、環境変数テンプレートを追加。
- 2026-03-16: `docs/project-conventions.md` を追加し、Server Components 優先と `lib/` 集約方針を明文化。
- 2026-03-16: `.env.local.example` を追加し、テンプレート管理方針を `docs/decisions.md` に記録。
- 2026-03-16: `eslint .`, `npm run typecheck`, `npm run build` を実行し、ビルドは `next build --webpack` で通過することを確認。
