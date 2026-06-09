import { format, subDays } from "date-fns";
import type { StudySession } from "@/lib/supabase/database.types";

export type DashboardDailyPoint = {
  day: string;
  minutes: number;
};

export type DashboardStats = {
  todaySessionCount: number;
  todayMinutes: number;
  yesterdayMinutes: number;
  studyStreak: number;
  totalFocusMinutes: number;
  weeklyMinutes: number;
  dailyData: DashboardDailyPoint[];
  sessionDates: string[];
  recentSessions: StudySession[];
};

function dateKey(iso: string): string {
  return format(new Date(iso), "yyyy-MM-dd");
}

export function computeDashboardStats(
  sessions: StudySession[] | null | undefined,
  studyStreak: number,
  totalFocusMinutes: number
): DashboardStats {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd");
  const weekStart = subDays(new Date(), 6);

  const meaningful =
    sessions?.filter((session) => session.focus_minutes > 0) ?? [];

  const todaySessions = meaningful.filter(
    (session) => dateKey(session.started_at) === todayStr
  );

  const todayMinutes = todaySessions.reduce(
    (acc, session) => acc + session.focus_minutes,
    0
  );

  const yesterdayMinutes = meaningful
    .filter((session) => dateKey(session.started_at) === yesterdayStr)
    .reduce((acc, session) => acc + session.focus_minutes, 0);

  const weeklyMinutes = meaningful
    .filter((session) => new Date(session.started_at) >= weekStart)
    .reduce((acc, session) => acc + session.focus_minutes, 0);

  const dailyData = Array.from({ length: 7 }, (_, index) => {
    const date = subDays(new Date(), 6 - index);
    const dateStr = format(date, "yyyy-MM-dd");
    const minutes = meaningful
      .filter((session) => dateKey(session.started_at) === dateStr)
      .reduce((acc, session) => acc + session.focus_minutes, 0);
    return { day: format(date, "EEE"), minutes };
  });

  const sessionDates = meaningful.map((session) => dateKey(session.started_at));

  return {
    todaySessionCount: todaySessions.length,
    todayMinutes,
    yesterdayMinutes,
    studyStreak,
    totalFocusMinutes,
    weeklyMinutes,
    dailyData,
    sessionDates,
    recentSessions: meaningful.slice(0, 10),
  };
}
