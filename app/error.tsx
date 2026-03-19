"use client";

import { useEffect } from "react";

import { AppErrorFallback } from "@/components/app-error-fallback";

type AppRouteError = Error & {
  digest?: string;
};

type ErrorPageProps = {
  error: AppRouteError;
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppErrorFallback
      title="画面の読み込みに失敗しました"
      description="管理画面のデータ取得中にエラーが発生しました。再試行するか、別画面へ移動して設定や実行ログを確認してください。"
      errorDigest={error.digest}
      onRetry={reset}
    />
  );
}
