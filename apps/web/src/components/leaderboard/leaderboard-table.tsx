import Link from "next/link";
import { Flame, Zap } from "lucide-react";
import type { LeaderboardEntry, LeaderboardTab } from "@/lib/leaderboard/data";
import { UserBadgeStrip } from "@/components/profile/user-badge-strip";
import { Avatar, Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFocusTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

function rankDisplay(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

function primaryScore(entry: LeaderboardEntry, tab: LeaderboardTab): string {
  if (tab === "week") return formatFocusTime(entry.weeklyFocusMinutes);
  if (tab === "streak") return `${entry.studyStreak} days`;
  return formatFocusTime(entry.totalFocusMinutes);
}

function planLabel(tier: LeaderboardEntry["planTier"]): boolean {
  return tier === "premium" || tier === "institution";
}

export function LeaderboardTable({
  leaders,
  tab,
  currentUserId,
  title,
}: {
  leaders: LeaderboardEntry[];
  tab: LeaderboardTab;
  currentUserId?: string;
  title: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {leaders.length} studier{leaders.length === 1 ? "" : "s"} ranked
        </p>
      </CardHeader>
      <CardContent>
        {leaders.length > 0 ? (
          <ol className="space-y-1">
            {leaders.map((leader, index) => {
              const rank = index + 1;
              const isYou = currentUserId === leader.id;
              const showPremium = planLabel(leader.planTier);

              return (
                <li
                  key={leader.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors",
                    isYou && "bg-primary/10 ring-1 ring-primary/20"
                  )}
                >
                  <span
                    className={cn(
                      "w-8 shrink-0 text-center text-sm font-bold",
                      rank <= 3 ? "text-base" : "text-muted-foreground"
                    )}
                  >
                    {rankDisplay(rank)}
                  </span>
                  <Avatar
                    src={leader.avatarUrl}
                    fallback={leader.displayName}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/profile/${leader.username}`}
                        className="truncate text-sm font-medium hover:text-primary"
                      >
                        {leader.displayName}
                      </Link>
                      {isYou && (
                        <Badge variant="accent" className="text-[10px]">
                          You
                        </Badge>
                      )}
                      {showPremium && (
                        <UserBadgeStrip
                          planTier={leader.planTier}
                          compact
                        />
                      )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      @{leader.username}
                      {leader.subjectTags.length > 0 && (
                        <span> · {leader.subjectTags.slice(0, 2).join(", ")}</span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-primary">
                      {primaryScore(leader, tab)}
                    </p>
                    {tab !== "streak" && leader.studyStreak > 0 && (
                      <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <Flame className="h-3 w-3 text-accent" />
                        {leader.studyStreak}d
                      </p>
                    )}
                    {tab === "streak" && leader.totalFocusMinutes > 0 && (
                      <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                        <Zap className="h-3 w-3" />
                        {formatFocusTime(leader.totalFocusMinutes)} total
                      </p>
                    )}
                    {tab === "week" && leader.totalFocusMinutes > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {formatFocusTime(leader.totalFocusMinutes)} all-time
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            No one has logged activity for this ranking yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
