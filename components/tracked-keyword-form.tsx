"use client";

import { type FormEvent, useState, useTransition } from "react";
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
};

export function TrackedKeywordForm({
  currentFiltersHref,
  initialTrackedKeyword,
}: TrackedKeywordFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [keyword, setKeyword] = useState(initialTrackedKeyword?.keyword ?? "");
  const [targetUrl, setTargetUrl] = useState(
    initialTrackedKeyword?.target_url ?? "",
  );
  const [category, setCategory] = useState(
    initialTrackedKeyword?.category ?? "",
  );
  const [pillar, setPillar] = useState(
    initialTrackedKeyword?.pillar ?? "",
  );
  const [cluster, setCluster] = useState(
    initialTrackedKeyword?.cluster ?? "",
  );
  const [intent, setIntent] = useState(
    initialTrackedKeyword?.intent ?? "",
  );
  const [priority, setPriority] = useState(
    initialTrackedKeyword ? initialTrackedKeyword.priority ?? "" : "medium",
  );
  const [isActive, setIsActive] = useState(
    initialTrackedKeyword?.is_active ?? true,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

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
          <p className="text-sm font-medium">監視対象キーワード</p>
          <p className="mt-1 text-sm text-muted-foreground">
            keyword と target URL を登録し、cluster 分析に使う pillar / cluster / intent も管理します。
          </p>
        </div>
        {initialTrackedKeyword ? (
          <Button
            onClick={() => {
              router.replace(currentFiltersHref);
              router.refresh();
            }}
            type="button"
            variant="outline"
          >
            Clear edit
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
              placeholder="例: family travel"
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
              placeholder="family / travel / guide"
              type="text"
              value={category}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Pillar</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) => setPillar(event.target.value)}
              placeholder="travel planning"
              type="text"
              value={pillar}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Cluster</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) => setCluster(event.target.value)}
              placeholder="packing checklist"
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
          {isPending ? "Saving..." : initialTrackedKeyword ? "Update keyword" : "Add keyword"}
        </Button>
      </form>
    </section>
  );
}
