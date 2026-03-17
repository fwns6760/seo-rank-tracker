import Link from "next/link";

import { cn } from "@/lib/utils";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/keywords", label: "Keywords" },
  { href: "/clusters", label: "Clusters" },
  { href: "/pages", label: "Pages" },
  { href: "/rewrites", label: "Rewrites" },
  { href: "/links", label: "Links" },
  { href: "/settings", label: "Settings" },
];

type AppShellProps = Readonly<{
  children: React.ReactNode;
}>;

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-background/70 backdrop-blur">
        <div className="container flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              SEO rank tracker
            </p>
            <h1 className="text-lg font-semibold text-foreground">
              prosports.yoshilover.com monitoring console
            </h1>
          </div>
          <nav className="flex flex-wrap gap-2">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full border border-border/70 px-4 py-2 text-sm text-muted-foreground transition-colors",
                  "hover:border-primary/30 hover:bg-primary/5 hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="container py-8 md:py-10">{children}</main>
    </div>
  );
}
