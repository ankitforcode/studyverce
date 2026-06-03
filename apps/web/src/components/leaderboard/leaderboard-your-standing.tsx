import Link from "next/link";
import { Target, TrendingUp } from "lucide-react";
import type {
  LeaderboardTab,
  LeaderboardUserStanding,
} from "@/lib/leaderboard/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatFocusTime } from "@/lib/utils";

function tabLabel(tab: LeaderboardTab): string {
  if (tab === "week") return "this week";
  if (tab === "streak") return "streak";
  return "all-time focus";
}

function yourScore(
  standing: LeaderboardUserStanding,
  tab: LeaderboardTab
): string {
  const e = standing.entry;
  if (!e) return "—";
  if (tab === "week") return formatFocusTime(e.weeklyFocusMinutes);
  if (tab === "streak") return `${e.studyStreak} days`;
  return formatFocusTime(e.totalFocusMinutes);
}

export function LeaderboardYourStanding({
  standing,
  tab,
  isLoggedIn,
}: {
  standing: LeaderboardUserStanding;
  tab: LeaderboardTab;
  isLoggedIn: boolean;
}) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-primary" />
          Your standing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!isLoggedIn ? (
          <p className="text-muted-foreground">
            <Link href="/auth/login?redirect=/leaderboard" className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            to see your rank and track progress against the community.
          </p>
        ) : standing.rank ? (
          <>
            <p>
              <span className="text-3xl font-bold text-primary">#{standing.rank}</span>
              <span className="ml-2 text-muted-foreground">
                of {standing.totalRanked} on {tabLabel(tab)}
              </span>
            </p>
            <p className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
              Your score: <span className="font-medium text-foreground">{yourScore(standing, tab)}</span>
            </p>
            {standing.entry && (
              <Link
                href={`/profile/${standing.entry.username}`}
                className="inline-block text-primary hover:underline"
              >
                View your profile →
              </Link>
            )}
          </>
        ) : (
          <p className="text-muted-foreground">
            You are not ranked on {tabLabel(tab)} yet.{" "}
            <Link href="/rooms" className="text-primary hover:underline">
              Join a study room
            </Link>{" "}
            and complete a focus session to climb the board.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
