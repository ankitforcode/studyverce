"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { LeaderboardTab } from "@/lib/leaderboard/data";
import { cn } from "@/lib/utils";

const tabs: { id: LeaderboardTab; label: string; description: string }[] = [
  { id: "all-time", label: "All-time", description: "Total focus hours" },
  { id: "week", label: "This week", description: "Since Monday (UTC)" },
  { id: "streak", label: "Streaks", description: "Consecutive study days" },
];

export function LeaderboardTabs({ activeTab }: { activeTab: LeaderboardTab }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const params = new URLSearchParams(searchParams.toString());
        if (tab.id === "all-time") {
          params.delete("tab");
        } else {
          params.set("tab", tab.id);
        }
        const href = params.size ? `${pathname}?${params}` : pathname;
        const active = activeTab === tab.id;

        return (
          <Link
            key={tab.id}
            href={href}
            className={cn(
              "rounded-xl border px-4 py-3 text-left transition-colors",
              active
                ? "border-primary/40 bg-primary/10 text-foreground"
                : "border-border bg-card/50 text-muted-foreground hover:border-primary/20 hover:bg-muted/40 hover:text-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <span className="block text-sm font-semibold">{tab.label}</span>
            <span className="mt-0.5 block text-xs opacity-80">{tab.description}</span>
          </Link>
        );
      })}
    </div>
  );
}
