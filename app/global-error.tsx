"use client";

import { useEffect } from "react";

import "./globals.css";

import { AppErrorFallback } from "@/components/app-error-fallback";

type AppGlobalError = Error & {
  digest?: string;
};

type GlobalErrorPageProps = {
  error: AppGlobalError;
  reset: () => void;
};

export default function GlobalErrorPage({
  error,
  reset,
}: GlobalErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ja">
      <body>
        <AppErrorFallback
          title="アプリの初期化に失敗しました"
          description="レイアウトまたは初期データの読み込みで致命的なエラーが発生しました。再試行しても直らない場合は設定値と Cloud Logging を確認してください。"
          errorDigest={error.digest}
          fullScreen
          onRetry={reset}
        />
      </body>
    </html>
  );
}
