"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type TrackedKeywordStatusButtonProps = {
  currentFiltersHref: string;
  trackedKeyword: {
    keyword: string;
    target_url: string;
    category: string | null;
    pillar: string | null;
    cluster: string | null;
    intent: string | null;
    priority: string | null;
    is_active: boolean;
  };
};

export function TrackedKeywordStatusButton({
  currentFiltersHref,
  trackedKeyword,
}: TrackedKeywordStatusButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        disabled={isPending}
        onClick={() => {
          setStatusMessage(null);
          startTransition(async () => {
            try {
              const response = await fetch("/api/settings/tracked-keywords", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  originalKeyword: trackedKeyword.keyword,
                  originalTargetUrl: trackedKeyword.target_url,
                  keyword: trackedKeyword.keyword,
                  targetUrl: trackedKeyword.target_url,
                  category: trackedKeyword.category,
                  pillar: trackedKeyword.pillar,
                  cluster: trackedKeyword.cluster,
                  intent: trackedKeyword.intent,
                  priority: trackedKeyword.priority,
                  isActive: !trackedKeyword.is_active,
                }),
              });

              const payload = (await response.json()) as {
                error?: string;
              };

              if (!response.ok) {
                throw new Error(payload.error ?? "Failed to update status");
              }

              router.replace(currentFiltersHref);
              router.refresh();
            } catch (error) {
              setStatusMessage(
                error instanceof Error
                  ? error.message
                  : "Failed to update status",
              );
            }
          });
        }}
        size="sm"
        type="button"
        variant={trackedKeyword.is_active ? "outline" : "secondary"}
      >
        {isPending
          ? "Saving..."
          : trackedKeyword.is_active
            ? "Disable"
            : "Activate"}
      </Button>
      {statusMessage ? (
        <p className="text-xs text-destructive">{statusMessage}</p>
      ) : null}
    </div>
  );
}
