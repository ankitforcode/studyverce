import Link from "next/link";
import { CheckCircle2, Clock, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFocusTime } from "@/lib/utils";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { StudyCalendar } from "@/components/dashboard/study-calendar";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { RemindersTodayStat } from "@/components/dashboard/reminders-today-stat";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ReferralProgressCard } from "@/components/referrals/referral-progress-card";
import { getReferralsPageData } from "@/app/settings/referrals/actions";
import { computeDashboardStats } from "@/lib/dashboard/stats";
import { subDays, format } from "date-fns";

export const dynamic = "force-dynamic";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatHoursShort(minutes: number): string {
  if (minutes === 0) return "0h";
  const hours = minutes / 60;
  return hours < 10 ? `${hours.toFixed(1)}h` : `${Math.round(hours)}h`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  if (!profile.onboarding_completed) {
    return (
      <div className="min-h-[calc(100dvh-4rem)] bg-background">
        <div className="mx-auto flex max-w-7xl flex-1 items-center justify-center px-4 py-16 text-center sm:px-6">
          <div>
            <p className="mb-4 text-muted-foreground">
              Complete your profile to get started
            </p>
            <Link href="/onboarding" className="text-primary hover:underline">
              Continue onboarding
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", user.id)
    .gte("started_at", subDays(new Date(), 30).toISOString())
    .order("started_at", { ascending: false });

  const stats = computeDashboardStats(
    sessions,
    profile.study_streak,
    profile.total_focus_minutes
  );

  const referralData = await getReferralsPageData();

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background">
      <div className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-2xl font-bold text-primary">{getGreeting()}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Welcome back, {profile.display_name}
            </p>
          </div>
          <Link
            href="/rooms"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
          >
            Join a study room
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          label="Sessions Today"
          value={String(stats.todaySessionCount)}
          icon={CheckCircle2}
          trend={
            stats.todaySessionCount > 0
              ? `+${stats.todaySessionCount}`
              : undefined
          }
          variant="primary"
        />
        <DashboardStatCard
          label="Hours Spent"
          value={formatHoursShort(stats.todayMinutes)}
          icon={Clock}
          hint={
            stats.todayMinutes > stats.yesterdayMinutes && stats.yesterdayMinutes > 0
              ? `+${formatHoursShort(stats.todayMinutes - stats.yesterdayMinutes)} vs yesterday`
              : `${formatHoursShort(stats.weeklyMinutes)} this week`
          }
          variant="teal"
        />
        <DashboardStatCard
          label="Day Streak"
          value={String(stats.studyStreak)}
          icon={Zap}
          hint={`${formatHoursShort(stats.totalFocusMinutes)} total focus`}
          variant="accent"
        />
        <RemindersTodayStat />
      </div>

      <QuickActions />

      {referralData && <ReferralProgressCard data={referralData} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCharts data={stats.dailyData} />
        <StudyCalendar sessionDates={stats.sessionDates} />
      </div>

      <Card id="reminders">
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentSessions.length > 0 ? (
            <ul className="space-y-3">
              {stats.recentSessions.map((session) => (
                <li
                  key={session.id}
                  className="flex items-center justify-between border-b border-border pb-3 text-sm last:border-0"
                >
                  <div>
                    <p className="font-medium">
                      {session.goal_text || "Focus session"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(
                        new Date(session.started_at),
                        "MMM d, yyyy 'at' h:mm a"
                      )}
                    </p>
                  </div>
                  <Badge variant="default">
                    {formatFocusTime(session.focus_minutes)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No sessions yet.{" "}
              <Link href="/rooms" className="text-primary hover:underline">
                Join a study room
              </Link>{" "}
              and start the pomodoro timer to track focus time.
            </p>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
