"use client";

import { type FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  trackedKeywordIntents,
  trackedKeywordPriorities,
} from "@/lib/validators/settings";

type TrackedKeywordFormProps = {
  currentFiltersHref: string;
  initialTrackedKeyword?: {
    keyword: string;
    target_url: string;
    category: string | null;
    pillar: string | null;
    cluster: string | null;
    intent: string | null;
    priority: string | null;
    is_active: boolean;
  } | null;
  draftTrackedKeyword?: {
    keyword: string;
    target_url: string;
    priority?: string | null;
  } | null;
};

export function TrackedKeywordForm({
  currentFiltersHref,
  initialTrackedKeyword,
  draftTrackedKeyword,
}: TrackedKeywordFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [keyword, setKeyword] = useState(
    initialTrackedKeyword?.keyword ?? draftTrackedKeyword?.keyword ?? "",
  );
  const [targetUrl, setTargetUrl] = useState(
    initialTrackedKeyword?.target_url ?? draftTrackedKeyword?.target_url ?? "",
  );
  const [category, setCategory] = useState(initialTrackedKeyword?.category ?? "");
  const [pillar, setPillar] = useState(initialTrackedKeyword?.pillar ?? "");
  const [cluster, setCluster] = useState(initialTrackedKeyword?.cluster ?? "");
  const [intent, setIntent] = useState(initialTrackedKeyword?.intent ?? "");
  const [priority, setPriority] = useState(
    initialTrackedKeyword
      ? initialTrackedKeyword.priority ?? ""
      : draftTrackedKeyword?.priority ?? "medium",
  );
  const [isActive, setIsActive] = useState(
    initialTrackedKeyword?.is_active ?? true,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const hasSelection = Boolean(initialTrackedKeyword || draftTrackedKeyword);
  const heading = initialTrackedKeyword
    ? {
        title: "監視対象キーワードを編集",
        description:
          "既存 row を更新します。logical key は `keyword + target_url` です。",
      }
    : draftTrackedKeyword
      ? {
          title: "GSC 候補から新規追加",
          description:
            "直近の `daily_rankings` から keyword / URL を prefill 済みです。taxonomy を補って保存してください。",
        }
      : {
          title: "監視対象キーワード",
          description:
            "keyword と target URL を登録し、cluster 分析に使う pillar / cluster / intent も管理します。",
        };

  useEffect(() => {
    setKeyword(initialTrackedKeyword?.keyword ?? draftTrackedKeyword?.keyword ?? "");
    setTargetUrl(
      initialTrackedKeyword?.target_url ?? draftTrackedKeyword?.target_url ?? "",
    );
    setCategory(initialTrackedKeyword?.category ?? "");
    setPillar(initialTrackedKeyword?.pillar ?? "");
    setCluster(initialTrackedKeyword?.cluster ?? "");
    setIntent(initialTrackedKeyword?.intent ?? "");
    setPriority(
      initialTrackedKeyword
        ? initialTrackedKeyword.priority ?? ""
        : draftTrackedKeyword?.priority ?? "medium",
    );
    setIsActive(initialTrackedKeyword?.is_active ?? true);
    setStatusMessage(null);
    setHasError(false);
  }, [draftTrackedKeyword, initialTrackedKeyword]);

  function resetForm() {
    setKeyword("");
    setTargetUrl("");
    setCategory("");
    setPillar("");
    setCluster("");
    setIntent("");
    setPriority("medium");
    setIsActive(true);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    setHasError(false);

    startTransition(async () => {
      try {
        const response = await fetch("/api/settings/tracked-keywords", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            originalKeyword: initialTrackedKeyword?.keyword ?? null,
            originalTargetUrl: initialTrackedKeyword?.target_url ?? null,
            keyword,
            targetUrl,
            category,
            pillar,
            cluster,
            intent,
            priority,
            isActive,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to save tracked keyword");
        }

        setStatusMessage("tracked keyword を保存しました。");
        setHasError(false);
        if (!initialTrackedKeyword) {
          resetForm();
        }
        router.replace(currentFiltersHref);
        router.refresh();
      } catch (error) {
        setStatusMessage(
          error instanceof Error
            ? error.message
            : "Failed to save tracked keyword",
        );
        setHasError(true);
      }
    });
  }

  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{heading.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {heading.description}
          </p>
        </div>
        {hasSelection ? (
          <Button
            onClick={() => {
              router.replace(currentFiltersHref);
              router.refresh();
            }}
            type="button"
            variant="outline"
          >
            Clear selection
          </Button>
        ) : null}
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Keyword</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="例: 大谷翔平 ホームラン"
              type="text"
              value={keyword}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Target URL</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) => setTargetUrl(event.target.value)}
              placeholder="https://prosports.yoshilover.com/..."
              type="url"
              value={targetUrl}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Category</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) => setCategory(event.target.value)}
              placeholder="npb / mlb / analysis"
              type="text"
              value={category}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Pillar</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) => setPillar(event.target.value)}
              placeholder="MLB 分析"
              type="text"
              value={pillar}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Cluster</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) => setCluster(event.target.value)}
              placeholder="ドジャース戦レビュー"
              type="text"
              value={cluster}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[180px_220px_160px]">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Priority</span>
            <select
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) => setPriority(event.target.value)}
              value={priority}
            >
              <option value="">--</option>
              {trackedKeywordPriorities.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Intent</span>
            <select
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) => setIntent(event.target.value)}
              value={intent}
            >
              <option value="">--</option>
              {trackedKeywordIntents.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Status</span>
            <select
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) => setIsActive(event.target.value === "active")}
              value={isActive ? "active" : "inactive"}
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>
        </div>

        <p className="text-sm text-muted-foreground">
          `category` は既存の運用ラベル、`pillar / cluster` は SEO テーマ構造、`intent`
          は固定語彙の検索意図です。`cluster` を入れる場合は `pillar` も必要です。
        </p>
        {!initialTrackedKeyword && draftTrackedKeyword?.priority === "high" ? (
          <p className="text-sm text-muted-foreground">
            この候補は初期投入向けに `priority=high` を初期値にしています。
          </p>
        ) : null}

        {statusMessage ? (
          <p
            className={cn(
              "text-sm",
              hasError ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {statusMessage}
          </p>
        ) : null}

        <Button disabled={isPending} type="submit">
          {isPending
            ? "Saving..."
            : initialTrackedKeyword
              ? "Update keyword"
              : "Add keyword"}
        </Button>
      </form>
    </section>
  );
}
