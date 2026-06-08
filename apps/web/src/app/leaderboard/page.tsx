import Link from "next/link";
import { Suspense } from "react";
import { startOfWeek, format } from "date-fns";
import {
  Trophy,
  Users,
  Clock,
  Flame,
  BarChart3,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { LeaderboardTabs } from "@/components/leaderboard/leaderboard-tabs";
import { LeaderboardPodium } from "@/components/leaderboard/leaderboard-podium";
import { LeaderboardTable } from "@/components/leaderboard/leaderboard-table";
import { LeaderboardYourStanding } from "@/components/leaderboard/leaderboard-your-standing";
import {
  getLeaderboardPageData,
  parseLeaderboardTab,
} from "@/lib/leaderboard/data";
import { formatFocusTime } from "@/lib/utils";
import { createSiteMetadata } from "@/lib/site-metadata";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = createSiteMetadata({
  path: "/leaderboard",
  title: "Study Focus Leaderboard",
  description:
    "See top study streaks and weekly focus hours on the StudyVerce leaderboard. Compare progress with students in virtual study rooms.",
});

export const dynamic = "force-dynamic";

function formatHoursShort(minutes: number): string {
  if (minutes === 0) return "0h";
  const hours = minutes / 60;
  return hours < 10 ? `${hours.toFixed(1)}h` : `${Math.round(hours)}h`;
}

function tableTitle(tab: ReturnType<typeof parseLeaderboardTab>): string {
  if (tab === "week") return "This week's focus leaders";
  if (tab === "streak") return "Longest study streaks";
  return "All-time focus leaders";
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab = parseLeaderboardTab(tabParam);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const data = await getLeaderboardPageData(tab, user?.id);
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "MMM d");

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <div className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-accent" />
              <h1 className="text-2xl font-bold">Leaderboard</h1>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              See how you stack up — focus time, weekly momentum, and streaks
            </p>
          </div>
          <Link
            href="/rooms"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
          >
            Start a focus session
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <DashboardStatCard
            label="Active studiers"
            value={String(data.community.activeStudiers)}
            icon={Users}
            variant="primary"
          />
          <DashboardStatCard
            label="Community focus"
            value={formatHoursShort(data.community.totalCommunityMinutes)}
            icon={Clock}
            hint="combined all-time"
            variant="teal"
          />
          <DashboardStatCard
            label="Top streak"
            value={`${data.community.topStreak}d`}
            icon={Flame}
            variant="accent"
          />
          <DashboardStatCard
            label="Avg per studier"
            value={formatHoursShort(data.community.averageFocusMinutes)}
            icon={BarChart3}
            variant="muted"
          />
        </div>

        <Suspense
          fallback={
            <div className="h-[72px] animate-pulse rounded-xl bg-muted/40" />
          }
        >
          <LeaderboardTabs activeTab={tab} />
        </Suspense>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Top 3</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {tab === "week"
                    ? `Week of ${weekStart} (UTC)`
                    : tab === "streak"
                      ? "Longest active streaks"
                      : "Most focus time recorded"}
                </p>
              </CardHeader>
              <CardContent>
                <LeaderboardPodium leaders={data.activeList.slice(0, 3)} tab={tab} />
              </CardContent>
            </Card>

            <LeaderboardTable
              leaders={data.activeList}
              tab={tab}
              currentUserId={user?.id}
              title={tableTitle(tab)}
            />
          </div>

          <div className="space-y-6">
            <LeaderboardYourStanding
              standing={data.you}
              tab={tab}
              isLoggedIn={!!user}
            />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick compare</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <span className="text-muted-foreground">All-time #1</span>
                  <span className="font-medium text-right truncate">
                    {data.allTime[0]?.displayName ?? "—"}
                    {data.allTime[0] && (
                      <span className="block text-xs text-primary">
                        {formatFocusTime(data.allTime[0].totalFocusMinutes)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <span className="text-muted-foreground">This week #1</span>
                  <span className="font-medium text-right truncate">
                    {data.weekly[0]?.displayName ?? "—"}
                    {data.weekly[0] && (
                      <span className="block text-xs text-primary">
                        {formatFocusTime(data.weekly[0].weeklyFocusMinutes)}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Top streak</span>
                  <span className="font-medium text-right truncate">
                    {data.streaks[0]?.displayName ?? "—"}
                    {data.streaks[0] && (
                      <span className="block text-xs text-primary">
                        {data.streaks[0].studyStreak} days
                      </span>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            {user && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Climb the board</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <p>
                    Weekly rankings reset every Monday (UTC). Streaks grow when you
                    study on consecutive days.
                  </p>
                  <Link href="/dashboard" className="text-primary hover:underline">
                    Track your sessions on the dashboard →
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
