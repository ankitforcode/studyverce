import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Flame, Clock, Award } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge, Avatar } from "@/components/ui/badge";
import { formatFocusTime } from "@/lib/utils";
import { normalizeProfileUsername } from "@/lib/profiles/username";
import { createSiteMetadata, NOINDEX_ROBOTS } from "@/lib/site-metadata";

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

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username: rawUsername } = await params;
  const username = normalizeProfileUsername(rawUsername);
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username)
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const { data: achievements } = await supabase
    .from("user_achievements")
    .select("earned_at, achievements(slug, name, description, icon)")
    .eq("user_id", profile.id);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isOwnProfile = user?.id === profile.id;
  if (rawUsername !== profile.username) {
    redirect(`/profile/${profile.username}`);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
        <Avatar src={profile.avatar_url} fallback={profile.display_name} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold sm:text-3xl">{profile.display_name}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          {profile.subject_tags.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-center gap-1.5 sm:justify-start">
              {profile.subject_tags.map((tag) => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>
          )}
          {isOwnProfile && (
            <Link
              href="/settings/profile"
              className="mt-3 inline-block text-sm text-primary hover:underline"
            >
              Edit profile
            </Link>
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
            <Badge variant={profile.plan_tier === "free" ? "secondary" : "accent"}>
              {profile.plan_tier}
            </Badge>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Achievements</CardTitle>
        </CardHeader>
        <CardContent>
          {achievements && achievements.length > 0 ? (
            <ul className="space-y-2">
              {achievements.map((ua) => {
                const achievement = ua.achievements as unknown as {
                  slug: string;
                  name: string;
                  description: string;
                  icon: string;
                } | null;
                if (!achievement) return null;
                return (
                  <li key={achievement.slug} className="flex items-center gap-3 text-sm">
                    <span className="text-lg">🏆</span>
                    <div>
                      <p className="font-medium">{achievement.name}</p>
                      <p className="text-muted-foreground text-xs">{achievement.description}</p>
                    </div>
                  </li>
                );
              })}
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
