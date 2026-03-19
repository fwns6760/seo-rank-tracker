import { AppNavigation } from "@/components/app-navigation";

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
          <AppNavigation />
        </div>
      </header>
      <main className="container py-8 md:py-10">{children}</main>
    </div>
  );
}
