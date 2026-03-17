"use client";

import { type FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { OperationalSettings } from "@/lib/settings/config";
import { cn } from "@/lib/utils";

type AppSettingsFormProps = {
  initialSettings: OperationalSettings;
};

export function AppSettingsForm({ initialSettings }: AppSettingsFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [alertDropThreshold, setAlertDropThreshold] = useState(
    String(initialSettings.alertDropThreshold),
  );
  const [alertRiseThreshold, setAlertRiseThreshold] = useState(
    String(initialSettings.alertRiseThreshold),
  );
  const [rewriteCandidateMinImpressions, setRewriteCandidateMinImpressions] =
    useState(String(initialSettings.rewriteCandidateMinImpressions));
  const [slackWebhookUrl, setSlackWebhookUrl] = useState(
    initialSettings.slackWebhookUrl,
  );
  const [schedulerTimeJst, setSchedulerTimeJst] = useState(
    initialSettings.schedulerTimeJst,
  );
  const [targetSiteHost, setTargetSiteHost] = useState(
    initialSettings.targetSiteHost,
  );
  const [wordpressBaseUrl, setWordpressBaseUrl] = useState(
    initialSettings.wordpressBaseUrl,
  );
  const [wordpressAuthMode, setWordpressAuthMode] = useState(
    initialSettings.wordpressAuthMode,
  );
  const [wordpressUsername, setWordpressUsername] = useState(
    initialSettings.wordpressUsername,
  );
  const [
    wordpressApplicationPasswordSecretName,
    setWordpressApplicationPasswordSecretName,
  ] = useState(initialSettings.wordpressApplicationPasswordSecretName);
  const [wordpressPostType, setWordpressPostType] = useState(
    initialSettings.wordpressPostType,
  );
  const [wordpressPostStatuses, setWordpressPostStatuses] = useState(
    initialSettings.wordpressPostStatuses,
  );
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    setHasError(false);

    startTransition(async () => {
      try {
        const response = await fetch("/api/settings/app-config", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            alertDropThreshold,
            alertRiseThreshold,
            rewriteCandidateMinImpressions,
            slackWebhookUrl,
            schedulerTimeJst,
            targetSiteHost,
            wordpressBaseUrl,
            wordpressAuthMode,
            wordpressUsername,
            wordpressApplicationPasswordSecretName,
            wordpressPostType,
            wordpressPostStatuses,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
        };

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to save app settings");
        }

        setStatusMessage("運用設定を保存しました。");
        router.refresh();
      } catch (error) {
        setStatusMessage(
          error instanceof Error ? error.message : "Failed to save app settings",
        );
        setHasError(true);
      }
    });
  }

  return (
    <section className="rounded-[1.5rem] border border-border/70 bg-card/80 p-5 shadow-sm">
      <div>
        <p className="text-sm font-medium">運用設定</p>
        <p className="mt-1 text-sm text-muted-foreground">
          閾値、Slack Webhook、実行時刻、対象サイト、WordPress 接続設定を保存します。
        </p>
      </div>

      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Drop threshold</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              min="0"
              onChange={(event) => setAlertDropThreshold(event.target.value)}
              step="1"
              type="number"
              value={alertDropThreshold}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Rise threshold</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              min="0"
              onChange={(event) => setAlertRiseThreshold(event.target.value)}
              step="1"
              type="number"
              value={alertRiseThreshold}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Rewrite min impressions</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              min="0"
              onChange={(event) =>
                setRewriteCandidateMinImpressions(event.target.value)
              }
              step="1"
              type="number"
              value={rewriteCandidateMinImpressions}
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Slack Webhook</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) => setSlackWebhookUrl(event.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              type="url"
              value={slackWebhookUrl}
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Execution time JST</span>
            <input
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
              onChange={(event) => setSchedulerTimeJst(event.target.value)}
              type="time"
              value={schedulerTimeJst}
            />
          </label>
        </div>

        <label className="space-y-2 text-sm">
          <span className="font-medium">Target site host</span>
          <input
            className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
            onChange={(event) => setTargetSiteHost(event.target.value)}
            placeholder="prosports.yoshilover.com"
            type="text"
            value={targetSiteHost}
          />
        </label>

        <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
          <div>
            <p className="text-sm font-medium">WordPress sync</p>
            <p className="mt-1 text-sm text-muted-foreground">
              接続先、認証モード、同期範囲は `app_settings` に保存します。実際の
              application password 自体は保存せず、Job 実行時に Secret Manager
              から `WORDPRESS_APPLICATION_PASSWORD` として注入し、ここでは参照名だけを持ちます。
            </p>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_180px_220px]">
            <label className="space-y-2 text-sm md:col-span-2">
              <span className="font-medium">WordPress Base URL</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                onChange={(event) => setWordpressBaseUrl(event.target.value)}
                placeholder="https://prosports.yoshilover.com"
                type="url"
                value={wordpressBaseUrl}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Auth mode</span>
              <select
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                onChange={(event) => setWordpressAuthMode(event.target.value as "none" | "basic")}
                value={wordpressAuthMode}
              >
                <option value="none">none</option>
                <option value="basic">basic</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm">
              <span className="font-medium">WordPress username</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                disabled={wordpressAuthMode !== "basic"}
                onChange={(event) => setWordpressUsername(event.target.value)}
                placeholder="editor@example.com"
                type="text"
                value={wordpressUsername}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Application password secret</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-60"
                disabled={wordpressAuthMode !== "basic"}
                onChange={(event) =>
                  setWordpressApplicationPasswordSecretName(event.target.value)
                }
                placeholder="projects/baseballsite/secrets/wordpress-application-password"
                type="text"
                value={wordpressApplicationPasswordSecretName}
              />
            </label>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            優先順位は CLI 引数 &gt; env &gt; `app_settings` です。平文で保持してよい
            項目だけをこの画面で更新し、機密値は Secret Manager に残します。
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]">
            <label className="space-y-2 text-sm">
              <span className="font-medium">Post type endpoint</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                onChange={(event) => setWordpressPostType(event.target.value)}
                placeholder="posts"
                type="text"
                value={wordpressPostType}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium">Post statuses</span>
              <input
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none"
                onChange={(event) => setWordpressPostStatuses(event.target.value)}
                placeholder="publish"
                type="text"
                value={wordpressPostStatuses}
              />
            </label>
          </div>
        </div>

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
          {isPending ? "Saving..." : "Save settings"}
        </Button>
      </form>
    </section>
  );
}
