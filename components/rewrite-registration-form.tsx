"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { WordPressPostRow } from "@/lib/bq";
import { cn } from "@/lib/utils";
import { rewriteTypePresets } from "@/lib/validators/rewrites";

type RewriteRegistrationFormProps = {
  className?: string;
  currentUrlSearch?: string;
  days: number;
  impactWindow?: number;
  defaultRewriteDate: string;
  initialUrl?: string;
  initialWpPostId?: number | string | null;
  wordpressOptions: WordPressPostRow[];
  wordpressWarning?: string | null;
  urlOptions: string[];
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

const rewriteTypeLabels: Record<(typeof rewriteTypePresets)[number], string> = {
  title: "タイトル",
  lead: "導入文",
  body_refresh: "本文更新",
  structure_update: "構成変更",
  internal_link: "内部リンク調整",
  full_refresh: "全面改稿",
};

export function RewriteRegistrationForm({
  className,
  currentUrlSearch,
  days,
  impactWindow,
  defaultRewriteDate,
  initialUrl,
  initialWpPostId,
  wordpressOptions,
  wordpressWarning,
  urlOptions,
}: RewriteRegistrationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [url, setUrl] = useState(initialUrl ?? "");
  const [selectedWpPostId, setSelectedWpPostId] = useState(
    initialWpPostId === null || initialWpPostId === undefined
      ? ""
      : String(initialWpPostId),
  );
  const [rewriteDate, setRewriteDate] = useState(defaultRewriteDate);
  const [rewriteTypePreset, setRewriteTypePreset] = useState<
    (typeof rewriteTypePresets)[number] | "custom"
  >("body_refresh");
  const [customRewriteType, setCustomRewriteType] = useState("");
  const [summary, setSummary] = useState("");
  const [memo, setMemo] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({
    kind: "idle",
    message: null,
  });

  const rewriteType = useMemo(() => {
    return rewriteTypePreset === "custom"
      ? customRewriteType.trim()
      : rewriteTypePreset;
  }, [customRewriteType, rewriteTypePreset]);

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

    params.set("url", nextUrl);
    params.set("days", String(days));
    params.set("impactWindow", String(impactWindow ?? 7));

    if (currentUrlSearch?.trim()) {
      params.set("urlSearch", currentUrlSearch.trim());
    }

    return `/rewrites?${params.toString()}`;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSubmitState({
      kind: "idle",
      message: null,
    });

    startTransition(async () => {
      try {
        const response = await fetch("/api/rewrites", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            wpPostId: selectedWpPostId ? Number(selectedWpPostId) : null,
            url,
            rewriteDate,
            rewriteType,
            summary,
            memo,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          rewrite?: {
            url: string;
            wp_post_id: number | string | null;
          };
        };

        if (!response.ok || !payload.rewrite) {
          throw new Error(payload.error ?? "Failed to register rewrite");
        }

        setSubmitState({
          kind: "success",
          message: "リライト履歴を登録しました。",
        });
        setSummary("");
        setMemo("");
        setUrl(payload.rewrite.url);
        setSelectedWpPostId(
          payload.rewrite.wp_post_id === null || payload.rewrite.wp_post_id === undefined
            ? ""
            : String(payload.rewrite.wp_post_id),
        );
        router.replace(buildNextHref(payload.rewrite.url));
        router.refresh();
      } catch (error) {
        setSubmitState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Failed to register rewrite",
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
        <p className="text-sm font-medium">リライト履歴登録</p>
        <p className="text-sm text-muted-foreground">
          `rewrites` に手動で施策履歴を残し、前後比較の基準日を作ります。
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
              list="rewrite-url-options"
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
              onChange={(event) => setRewriteDate(event.target.value)}
              type="date"
              value={rewriteDate}
            />
          </label>
        </div>

        {selectedWpPostId ? (
          <p className="text-sm text-muted-foreground">
            記事 ID {selectedWpPostId} に紐付けて保存します。URL が将来変わっても同一記事として追跡できます。
          </p>
        ) : null}

        {wordpressWarning ? (
          <p className="text-sm text-muted-foreground">
            WordPress 記事候補は読み込めませんでした: {wordpressWarning}
          </p>
        ) : null}

        <datalist id="rewrite-url-options">
          {urlOptions.map((option) => (
            <option key={option} value={option} />
          ))}
          {wordpressOptions
            .filter((option) => !urlOptions.includes(option.url))
            .map((option) => (
              <option key={option.url} value={option.url} />
            ))}
        </datalist>

        <div className="grid gap-4 md:grid-cols-[220px_1fr]">
          <label className="space-y-2 text-sm">
            <span className="font-medium">施策種別</span>
            <select
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) =>
                setRewriteTypePreset(
                  event.target.value as (typeof rewriteTypePresets)[number] | "custom",
                )
              }
              value={rewriteTypePreset}
            >
              {rewriteTypePresets.map((option) => (
                <option key={option} value={option}>
                  {rewriteTypeLabels[option]}
                </option>
              ))}
              <option value="custom">カスタム</option>
            </select>
          </label>

          <label className="space-y-2 text-sm">
            <span className="font-medium">保存される rewrite_type</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              disabled={rewriteTypePreset !== "custom"}
              onChange={(event) => setCustomRewriteType(event.target.value)}
              placeholder="custom_type"
              type="text"
              value={
                rewriteTypePreset === "custom" ? customRewriteType : rewriteType
              }
            />
          </label>
        </div>

        <label className="space-y-2 text-sm">
          <span className="font-medium">要約メモ</span>
          <textarea
            className="min-h-24 w-full rounded-2xl border border-input bg-background px-3 py-3 text-sm outline-none"
            maxLength={280}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="例: タイトルと導入文をドジャース戦レビュー向けに更新"
            value={summary}
          />
        </label>

        <label className="space-y-2 text-sm">
          <span className="font-medium">詳細メモ</span>
          <textarea
            className="min-h-32 w-full rounded-2xl border border-input bg-background px-3 py-3 text-sm outline-none"
            maxLength={2000}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="変更点、意図、参照した分析メモなど"
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
            {isPending ? "Saving..." : "Save rewrite"}
          </Button>
          <p className="self-center text-sm text-muted-foreground">
            summary と memo が空でも登録できます。
          </p>
        </div>
      </form>
    </section>
  );
}
