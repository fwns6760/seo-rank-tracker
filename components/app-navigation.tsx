"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

function isCurrentRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2">
      {navigationItems.map((item) => {
        const isActive = isCurrentRoute(pathname, item.href);

        return (
          <Link
            key={item.href}
            aria-current={isActive ? "page" : undefined}
            href={item.href}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              isActive
                ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
                : "border-border/70 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
