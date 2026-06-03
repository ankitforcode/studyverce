import Link from "next/link";
import { CheckCircle2, Clock, Zap, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatFocusTime } from "@/lib/utils";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { StudyCalendar } from "@/components/dashboard/study-calendar";
import { DashboardStatCard } from "@/components/dashboard/dashboard-stat-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
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

  const todayStr = format(new Date(), "yyyy-MM-dd");

  const { data: sessions } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", user.id)
    .gte("started_at", subDays(new Date(), 30).toISOString())
    .order("started_at", { ascending: false });

  const todaySessions =
    sessions?.filter(
      (s) => format(new Date(s.started_at), "yyyy-MM-dd") === todayStr
    ) ?? [];

  const todayMinutes = todaySessions.reduce((acc, s) => acc + s.focus_minutes, 0);

  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dateStr = format(date, "yyyy-MM-dd");
    const minutes =
      sessions
        ?.filter((s) => format(new Date(s.started_at), "yyyy-MM-dd") === dateStr)
        .reduce((acc, s) => acc + s.focus_minutes, 0) ?? 0;
    return { day: format(date, "EEE"), minutes };
  });

  const sessionDates =
    sessions
      ?.filter((s) => s.focus_minutes > 0)
      .map((s) => format(new Date(s.started_at), "yyyy-MM-dd")) ?? [];

  const yesterdayMinutes =
    sessions
      ?.filter(
        (s) =>
          format(new Date(s.started_at), "yyyy-MM-dd") ===
          format(subDays(new Date(), 1), "yyyy-MM-dd")
      )
      .reduce((acc, s) => acc + s.focus_minutes, 0) ?? 0;

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
          value={String(todaySessions.length)}
          icon={CheckCircle2}
          trend={todaySessions.length > 0 ? `+${todaySessions.length}` : undefined}
          variant="primary"
        />
        <DashboardStatCard
          label="Hours Spent"
          value={formatHoursShort(todayMinutes)}
          icon={Clock}
          hint={
            todayMinutes > yesterdayMinutes && yesterdayMinutes > 0
              ? `+${formatHoursShort(todayMinutes - yesterdayMinutes)} vs yesterday`
              : "today"
          }
          variant="teal"
        />
        <DashboardStatCard
          label="Day Streak"
          value={String(profile.study_streak)}
          icon={Zap}
          variant="accent"
        />
        <DashboardStatCard
          label="Reminders Today"
          value="0"
          icon={Bell}
          variant="muted"
        />
      </div>

      <QuickActions />

      <div className="grid gap-6 lg:grid-cols-2">
        <DashboardCharts data={dailyData} />
        <StudyCalendar sessionDates={sessionDates} />
      </div>

      <Card id="reminders">
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions && sessions.length > 0 ? (
            <ul className="space-y-3">
              {sessions.slice(0, 10).map((session) => (
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
              to get started.
            </p>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
