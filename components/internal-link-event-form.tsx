"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { WordPressPostRow } from "@/lib/bq";
import { cn } from "@/lib/utils";

type InternalLinkEventFormProps = {
  className?: string;
  currentUrlSearch?: string;
  days: number;
  impactWindow?: number;
  defaultChangeDate: string;
  initialUrl?: string;
  initialWpPostId?: number | string | null;
  pagePath: "/links" | "/pages";
  successQueryKey: "urlSearch" | "url";
  wordpressOptions: WordPressPostRow[];
  wordpressWarning?: string | null;
};

type SubmitState =
  | {
      kind: "idle";
      message: string | null;
    }
  | {
      kind: "success";
      message: string;
    }
  | {
      kind: "error";
      message: string;
    };

export function InternalLinkEventForm({
  className,
  currentUrlSearch,
  days,
  impactWindow,
  defaultChangeDate,
  initialUrl,
  initialWpPostId,
  pagePath,
  successQueryKey,
  wordpressOptions,
  wordpressWarning,
}: InternalLinkEventFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [selectedWpPostId, setSelectedWpPostId] = useState(
    initialWpPostId === null || initialWpPostId === undefined
      ? ""
      : String(initialWpPostId),
  );
  const [changeDate, setChangeDate] = useState(defaultChangeDate);
  const [summary, setSummary] = useState("");
  const [memo, setMemo] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({
    kind: "idle",
    message: null,
  });

  useEffect(() => {
    setUrl(initialUrl ?? "");
    setSelectedWpPostId(
      initialWpPostId === null || initialWpPostId === undefined
        ? ""
        : String(initialWpPostId),
    );
  }, [initialUrl, initialWpPostId]);

  function findWordPressPost(nextId: string) {
    return wordpressOptions.find(
      (option) => String(option.wp_post_id) === nextId,
    );
  }

  function buildNextHref(nextUrl: string) {
    const params = new URLSearchParams();

    params.set(successQueryKey, nextUrl);
    params.set("days", String(days));
    params.set("impactWindow", String(impactWindow ?? 7));

    if (pagePath === "/pages" && currentUrlSearch?.trim()) {
      params.set("urlSearch", currentUrlSearch.trim());
    }

    return `${pagePath}?${params.toString()}`;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState({
      kind: "idle",
      message: null,
    });

    startTransition(async () => {
      try {
        const response = await fetch("/api/internal-link-events", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            wpPostId: selectedWpPostId ? Number(selectedWpPostId) : null,
            url,
            changeDate,
            summary,
            memo,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          event?: {
            url: string;
            wp_post_id: number | string | null;
          };
        };

        if (!response.ok || !payload.event) {
          throw new Error(payload.error ?? "Failed to register internal link event");
        }

        setSubmitState({
          kind: "success",
          message: "内部リンク施策を登録しました。",
        });
        setSummary("");
        setMemo("");
        setUrl(payload.event.url);
        setSelectedWpPostId(
          payload.event.wp_post_id === null || payload.event.wp_post_id === undefined
            ? ""
            : String(payload.event.wp_post_id),
        );
        router.replace(buildNextHref(payload.event.url));
        router.refresh();
      } catch (error) {
        setSubmitState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to register internal link event",
        });
      }
    });
  }

  return (
    <section
      className={cn(
        "rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm",
        className,
      )}
    >
      <div className="space-y-1">
        <p className="text-sm font-medium">内部リンク施策登録</p>
        <p className="text-sm text-muted-foreground">
          rewrite とは分けて、内部リンクの追加や整理だけをこの履歴に残します。
        </p>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">WordPress 記事</span>
            <select
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) => {
                const nextId = event.target.value;
                setSelectedWpPostId(nextId);

                const selectedPost = findWordPressPost(nextId);

                if (selectedPost) {
                  setUrl(selectedPost.url);
                }
              }}
              value={selectedWpPostId}
            >
              <option value="">URL を手入力</option>
              {wordpressOptions.map((option) => (
                <option key={option.wp_post_id} value={String(option.wp_post_id)}>
                  {option.title ?? option.slug} / {option.url}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">URL</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) => {
                const nextUrl = event.target.value;
                setUrl(nextUrl);

                const matchedPost = wordpressOptions.find(
                  (option) => option.url === nextUrl,
                );

                setSelectedWpPostId(
                  matchedPost ? String(matchedPost.wp_post_id) : "",
                );
              }}
              placeholder="https://prosports.yoshilover.com/..."
              type="url"
              value={url}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">実施日</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) => setChangeDate(event.target.value)}
              type="date"
              value={changeDate}
            />
          </label>
        </div>

        {selectedWpPostId ? (
          <p className="text-sm text-muted-foreground">
            記事 ID {selectedWpPostId} に紐付けて保存します。URL 変更後も同じ記事の内部リンク施策として追跡できます。
          </p>
        ) : null}

        {wordpressWarning ? (
          <p className="text-sm text-muted-foreground">
            WordPress 記事候補は読み込めませんでした: {wordpressWarning}
          </p>
        ) : null}

        <label className="space-y-2 text-sm">
          <span className="font-medium">要約メモ</span>
          <textarea
            className="min-h-24 w-full rounded-2xl border border-input bg-background px-3 py-3 text-sm outline-none"
            maxLength={280}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="例: 親記事から比較記事への内部リンクを3本追加"
            value={summary}
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">詳細メモ</span>
          <textarea
            className="min-h-32 w-full rounded-2xl border border-input bg-background px-3 py-3 text-sm outline-none"
            maxLength={2000}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="追加元URL、アンカー、意図、確認メモなど"
            value={memo}
          />
        </label>

        {submitState.message ? (
          <p
            className={cn(
              "text-sm",
              submitState.kind === "error"
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {submitState.message}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <Button disabled={isPending} type="submit">
            {isPending ? "Saving..." : "Save internal link event"}
          </Button>
          <p className="self-center text-sm text-muted-foreground">
            rewrite ではなく、内部リンクの追加・削除・整理だけを登録します。
          </p>
        </div>
      </form>
    </section>
  );
}
