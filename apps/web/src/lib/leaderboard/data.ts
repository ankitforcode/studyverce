import type { PlanTier, PremiumSource } from "@studyverce/shared";
import { createClient } from "@/lib/supabase/server";
import { resolveEffectivePlanTierFromRow } from "@/lib/referrals/entitlements";

export type LeaderboardTab = "all-time" | "week" | "streak";

export type LeaderboardEntry = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  totalFocusMinutes: number;
  weeklyFocusMinutes: number;
  studyStreak: number;
  planTier: PlanTier;
  subjectTags: string[];
};

export type LeaderboardCommunityStats = {
  activeStudiers: number;
  totalCommunityMinutes: number;
  topStreak: number;
  averageFocusMinutes: number;
};

export type LeaderboardUserStanding = {
  rank: number | null;
  entry: LeaderboardEntry | null;
  totalRanked: number;
};

export type LeaderboardPageData = {
  tab: LeaderboardTab;
  community: LeaderboardCommunityStats;
  allTime: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  streaks: LeaderboardEntry[];
  activeList: LeaderboardEntry[];
  you: LeaderboardUserStanding;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  total_focus_minutes: number;
  study_streak: number;
  plan_tier: PlanTier;
  premium_until: string | null;
  premium_source: PremiumSource;
  subject_tags: string[];
};

function mapProfile(
  row: ProfileRow,
  weeklyByUser: Map<string, number>
): LeaderboardEntry {
  const effectivePlanTier = resolveEffectivePlanTierFromRow({
    plan_tier: row.plan_tier,
    premium_until: row.premium_until,
    premium_source: row.premium_source,
  });
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    totalFocusMinutes: row.total_focus_minutes,
    weeklyFocusMinutes: weeklyByUser.get(row.id) ?? 0,
    studyStreak: row.study_streak,
    planTier: effectivePlanTier,
    subjectTags: row.subject_tags ?? [],
  };
}

function sortAllTime(a: LeaderboardEntry, b: LeaderboardEntry) {
  return (
    b.totalFocusMinutes - a.totalFocusMinutes ||
    b.studyStreak - a.studyStreak ||
    a.username.localeCompare(b.username)
  );
}

function sortWeekly(a: LeaderboardEntry, b: LeaderboardEntry) {
  return (
    b.weeklyFocusMinutes - a.weeklyFocusMinutes ||
    b.totalFocusMinutes - a.totalFocusMinutes ||
    a.username.localeCompare(b.username)
  );
}

function sortStreak(a: LeaderboardEntry, b: LeaderboardEntry) {
  return (
    b.studyStreak - a.studyStreak ||
    b.totalFocusMinutes - a.totalFocusMinutes ||
    a.username.localeCompare(b.username)
  );
}

function findRank(
  list: LeaderboardEntry[],
  userId: string | undefined,
  score: (e: LeaderboardEntry) => number
): LeaderboardUserStanding {
  if (!userId) {
    return { rank: null, entry: null, totalRanked: list.length };
  }
  const entry = list.find((e) => e.id === userId) ?? null;
  if (!entry || score(entry) <= 0) {
    return { rank: null, entry, totalRanked: list.length };
  }
  const rank = list.findIndex((e) => e.id === userId) + 1;
  return { rank: rank > 0 ? rank : null, entry, totalRanked: list.length };
}

export function parseLeaderboardTab(tab: string | undefined): LeaderboardTab {
  if (tab === "week" || tab === "streak") return tab;
  return "all-time";
}

export async function getLeaderboardPageData(
  tab: LeaderboardTab,
  currentUserId?: string
): Promise<LeaderboardPageData> {
  const supabase = await createClient();

  const [{ data: profiles }, weeklyResult] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, total_focus_minutes, study_streak, plan_tier, premium_until, premium_source, subject_tags"
      ),
    supabase.rpc("leaderboard_weekly_focus", { p_limit: 100 }),
  ]);

  const weeklyByUser = new Map<string, number>();
  if (!weeklyResult.error && weeklyResult.data) {
    for (const row of weeklyResult.data as { user_id: string; weekly_minutes: number }[]) {
      weeklyByUser.set(row.user_id, Number(row.weekly_minutes));
    }
  }

  const entries = (profiles ?? []).map((row) =>
    mapProfile(row as ProfileRow, weeklyByUser)
  );

  const active = entries.filter(
    (e) => e.totalFocusMinutes > 0 || e.studyStreak > 0 || e.weeklyFocusMinutes > 0
  );

  const allTime = [...active].sort(sortAllTime).slice(0, 50);
  const weekly = [...active]
    .filter((e) => e.weeklyFocusMinutes > 0)
    .sort(sortWeekly)
    .slice(0, 50);
  const streaks = [...active]
    .filter((e) => e.studyStreak > 0)
    .sort(sortStreak)
    .slice(0, 50);

  const activeList =
    tab === "week" ? weekly : tab === "streak" ? streaks : allTime;

  const communityMinutes = active.reduce((sum, e) => sum + e.totalFocusMinutes, 0);

  const youStanding = (() => {
    if (tab === "week") {
      return findRank(weekly, currentUserId, (e) => e.weeklyFocusMinutes);
    }
    if (tab === "streak") {
      return findRank(streaks, currentUserId, (e) => e.studyStreak);
    }
    return findRank(allTime, currentUserId, (e) => e.totalFocusMinutes);
  })();

  return {
    tab,
    community: {
      activeStudiers: active.length,
      totalCommunityMinutes: communityMinutes,
      topStreak: active.reduce((max, e) => Math.max(max, e.studyStreak), 0),
      averageFocusMinutes:
        active.length > 0 ? Math.round(communityMinutes / active.length) : 0,
    },
    allTime,
    weekly,
    streaks,
    activeList,
    you: youStanding,
  };
}
