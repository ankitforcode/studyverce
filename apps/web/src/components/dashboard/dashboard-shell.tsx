"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Settings, RefreshCw, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { appNavSections } from "@/lib/app-nav";
import { DashboardTopBar } from "@/components/dashboard/dashboard-top-bar";
import { Avatar } from "@/components/ui/badge";

interface DashboardShellProps {
  children: React.ReactNode;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export function DashboardShell({
  children,
  username,
  displayName,
  avatarUrl,
}: DashboardShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-dvh bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-r border-border bg-card/40">
        <div className="p-4">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              pathname === "/dashboard"
                ? "bg-primary/15 text-primary shadow-sm shadow-primary/10"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Home className="h-4 w-4" />
            Dashboard
          </Link>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
          {appNavSections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {section.label}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <button
              type="button"
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <Link
              href="/rooms"
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Messages"
            >
              <MessageCircle className="h-4 w-4" />
            </Link>
          </div>
          <Link
            href={`/profile/${username}`}
            className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted transition-colors"
          >
            <Avatar src={avatarUrl} fallback={displayName} size="sm" />
            <span className="truncate text-sm font-medium">{displayName}</span>
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopBar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
