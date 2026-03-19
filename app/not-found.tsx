import Link from "next/link";
import { ArrowRight, Compass, SearchX, Settings2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 p-8 shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(12,115,168,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(236,126,74,0.16),transparent_22%)] opacity-80" />
      <div className="relative rounded-[1.75rem] border border-border/70 bg-background/90 p-8 backdrop-blur">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-accent/60 p-3 text-accent-foreground">
            <SearchX className="h-6 w-6" />
          </div>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
              Not Found
            </p>
            <h2 className="text-3xl font-semibold tracking-tight">
              指定された画面が見つかりません
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
              URL が古いか、画面の移動先が変わった可能性があります。主要画面に戻って対象の
              keyword、URL、設定を選び直してください。
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 rounded-[1.5rem] border border-border/70 bg-card/70 p-5 text-sm text-muted-foreground md:grid-cols-3">
          <div className="rounded-2xl bg-background/80 p-4">
            <Compass className="h-4 w-4 text-primary" />
            <p className="mt-3 font-medium text-foreground">Dashboard</p>
            <p className="mt-2 leading-6">
              実行状況、主要 KPI、アラートから辿り直せます。
            </p>
          </div>
          <div className="rounded-2xl bg-background/80 p-4">
            <ArrowRight className="h-4 w-4 text-primary" />
            <p className="mt-3 font-medium text-foreground">Pages / Keywords</p>
            <p className="mt-2 leading-6">
              URL や keyword を指定して、目的の詳細画面へ戻れます。
            </p>
          </div>
          <div className="rounded-2xl bg-background/80 p-4">
            <Settings2 className="h-4 w-4 text-primary" />
            <p className="mt-3 font-medium text-foreground">Settings</p>
            <p className="mt-2 leading-6">
              tracked keywords や接続設定の整合を確認できます。
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "default" }), "gap-2")}
          >
            <Compass className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/pages"
            className={cn(buttonVariants({ variant: "outline" }), "gap-2")}
          >
            <ArrowRight className="h-4 w-4" />
            Pages
          </Link>
          <Link
            href="/settings"
            className={cn(buttonVariants({ variant: "secondary" }), "gap-2")}
          >
            <Settings2 className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>
    </section>
  );
}
