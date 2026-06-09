import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Flame, Clock, Award } from "lucide-react";
import type { PremiumSource } from "@studyverce/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Avatar } from "@/components/ui/badge";
import {
  AchievementListItem,
  UserBadgeStrip,
} from "@/components/profile/user-badge-strip";
import { formatFocusTime } from "@/lib/utils";
import { normalizeProfileUsername } from "@/lib/profiles/username";
import { resolveEffectivePlanTierFromRow } from "@/lib/referrals/entitlements";
import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";
import { getCachedPublicProfile } from "@/lib/cache/profile";
import { getServerSupabase, getSessionUser } from "@/lib/auth/server-session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username: rawUsername } = await params;
  const username = normalizeProfileUsername(rawUsername);
  return createSiteMetadata({
    path: `/profile/${username}`,
    title: `${username} on StudyVerce`,
    robots: NOINDEX_ROBOTS,
  });
}

const PROFILE_SELECT =
  "id, username, display_name, avatar_url, subject_tags, study_streak, total_focus_minutes, plan_tier, premium_until, premium_source";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: rawUsername } = await params;
  const username = normalizeProfileUsername(rawUsername);

  const cached = await getCachedPublicProfile(username, async () => {
    const supabase = await getServerSupabase();

    const { data: profile } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("username", username)
      .maybeSingle();

    if (!profile) return null;

    const { data: achievements } = await supabase
      .from("user_achievements")
      .select("earned_at, achievements(slug, name, description, icon)")
      .eq("user_id", profile.id);

    const achievementItems =
      achievements?.flatMap((ua) => {
        const achievement = ua.achievements as unknown as {
          slug: string;
          name: string;
          description: string;
          icon: string;
        } | null;
        return achievement ? [achievement] : [];
      }) ?? [];

    return {
      profile: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        subject_tags: profile.subject_tags,
        study_streak: profile.study_streak,
        total_focus_minutes: profile.total_focus_minutes,
        plan_tier: profile.plan_tier,
        premium_until: profile.premium_until,
        premium_source: profile.premium_source,
      },
      achievements: achievementItems,
    };
  });

  if (!cached) {
    notFound();
  }

  const { profile, achievements: achievementItems } = cached;

  const user = await getSessionUser();
  const isOwnProfile = user?.id === profile.id;

  if (rawUsername !== profile.username) {
    redirect(`/profile/${profile.username}`);
  }

  const effectivePlan = resolveEffectivePlanTierFromRow({
    plan_tier: profile.plan_tier as "free" | "premium" | "institution",
    premium_until: profile.premium_until,
    premium_source: profile.premium_source as PremiumSource,
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
        <Avatar src={profile.avatar_url} fallback={profile.display_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl">{profile.display_name}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          <UserBadgeStrip
            className="mt-3 justify-center sm:justify-start"
            planTier={profile.plan_tier as "free" | "premium" | "institution"}
            premiumUntil={profile.premium_until}
            premiumSource={profile.premium_source as PremiumSource}
            achievements={achievementItems}
            showPremiumDetail={isOwnProfile}
          />
          {profile.subject_tags.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {profile.subject_tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}
          {isOwnProfile && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
              <Link href="/settings/profile" className="text-sm text-primary hover:underline">
                Edit profile
              </Link>
              <Link href="/settings/referrals" className="text-sm text-primary hover:underline">
                Invite friends
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Flame className="h-4 w-4 text-accent" /> Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{profile.study_streak} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" /> Total Focus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatFocusTime(profile.total_focus_minutes)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" /> Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={effectivePlan === "free" ? "secondary" : "accent"}>
              {effectivePlan}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          {achievementItems.length > 0 ? (
            <ul className="space-y-2">
              {achievementItems.map((achievement) => (
                <AchievementListItem
                  key={achievement.slug}
                  slug={achievement.slug}
                  name={achievement.name}
                  description={achievement.description}
                  icon={achievement.icon}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No achievements yet. Keep studying to earn badges!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
