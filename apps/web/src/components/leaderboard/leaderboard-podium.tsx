import Link from "next/link";
import { Crown, Medal } from "lucide-react";
import type { LeaderboardEntry, LeaderboardTab } from "@/lib/leaderboard/data";
import { Avatar } from "@/components/ui/badge";
import { formatFocusTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

function scoreLabel(entry: LeaderboardEntry, tab: LeaderboardTab): string {
  if (tab === "week") return formatFocusTime(entry.weeklyFocusMinutes);
  if (tab === "streak") return `${entry.studyStreak} day${entry.studyStreak === 1 ? "" : "s"}`;
  return formatFocusTime(entry.totalFocusMinutes);
}

function PodiumSpot({
  entry,
  rank,
  tab,
  className,
}: {
  entry: LeaderboardEntry;
  rank: 1 | 2 | 3;
  tab: LeaderboardTab;
  className?: string;
}) {
  const heights = { 1: "h-28", 2: "h-20", 3: "h-16" } as const;
  const colors = {
    1: "border-amber-400/50 bg-gradient-to-b from-amber-500/20 to-card",
    2: "border-slate-400/40 bg-gradient-to-b from-slate-400/15 to-card",
    3: "border-orange-700/40 bg-gradient-to-b from-orange-800/20 to-card",
  } as const;

  return (
    <div className={cn("flex flex-1 flex-col items-center", className)}>
      <Link
        href={`/profile/${entry.username}`}
        className="mb-2 flex flex-col items-center text-center transition-opacity hover:opacity-90"
      >
        {rank === 1 ? (
          <Crown className="mb-1 h-5 w-5 text-amber-400" />
        ) : (
          <Medal
            className={cn(
              "mb-1 h-4 w-4",
              rank === 2 ? "text-slate-300" : "text-orange-600"
            )}
          />
        )}
        <Avatar src={entry.avatarUrl} fallback={entry.displayName} size="md" />
        <p className="mt-2 max-w-[120px] truncate text-sm font-semibold">
          {entry.displayName}
        </p>
        <p className="text-xs text-muted-foreground">@{entry.username}</p>
      </Link>
      <div
        className={cn(
          "flex w-full max-w-[140px] flex-col items-center justify-end rounded-t-xl border px-2 pb-2 pt-3",
          heights[rank],
          colors[rank]
        )}
      >
        <span className="text-lg font-bold">{rank}</span>
        <span className="text-xs font-medium text-primary">{scoreLabel(entry, tab)}</span>
        {tab !== "streak" && entry.studyStreak > 0 && (
          <span className="mt-0.5 text-[10px] text-muted-foreground">
            {entry.studyStreak}d streak
          </span>
        )}
      </div>
    </div>
  );
}

export function LeaderboardPodium({
  leaders,
  tab,
}: {
  leaders: LeaderboardEntry[];
  tab: LeaderboardTab;
}) {
  const [first, second, third] = leaders;

  if (!first) {
    return (
      <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        No rankings yet for this period. Join a study room and complete a focus session
        to appear here.
      </p>
    );
  }

  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6">
      {second ? (
        <PodiumSpot entry={second} rank={2} tab={tab} className="order-1 max-w-[160px]" />
      ) : (
        <div className="order-1 flex-1" />
      )}
      <PodiumSpot entry={first} rank={1} tab={tab} className="order-2 max-w-[180px]" />
      {third ? (
        <PodiumSpot entry={third} rank={3} tab={tab} className="order-3 max-w-[160px]" />
      ) : (
        <div className="order-3 flex-1" />
      )}
    </div>
  );
}
