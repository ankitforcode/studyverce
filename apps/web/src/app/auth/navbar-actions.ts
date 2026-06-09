"use server";

import type { PlanTier, PremiumSource } from "@studyverce/shared";
import { createClient } from "@/lib/supabase/server";
import {
  legacyProfileToEntitlementRow,
  PROFILE_LEGACY_SELECT,
  PROFILE_NAVBAR_SELECT,
} from "@/lib/referrals/entitlements";

export type NavbarAuthState = {
  profile: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
    isAdmin: boolean;
    planTier: PlanTier;
    premiumUntil: string | null;
    premiumSource: PremiumSource;
    achievementSlugs: string[];
  } | null;
  pendingFriendRequests: number;
};

type NavbarProfileRow = {
  username: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  plan_tier: PlanTier;
  premium_until: string | null;
  premium_source: PremiumSource;
};

async function loadNavbarProfile(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<NavbarProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_NAVBAR_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (!error && data) {
    return data as NavbarProfileRow;
  }

  if (error) {
    console.error("getNavbarAuthState profile (entitlement):", error.message);
  }

  const { data: legacyRow, error: legacyError } = await supabase
    .from("profiles")
    .select(PROFILE_LEGACY_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (legacyError) {
    console.error("getNavbarAuthState profile (legacy):", legacyError.message);
    return null;
  }

  if (!legacyRow) return null;

  const entitlement = legacyProfileToEntitlementRow(legacyRow);
  return {
    ...legacyRow,
    premium_until: entitlement.premium_until,
    premium_source: entitlement.premium_source,
  };
}

export async function getNavbarAuthState(): Promise<NavbarAuthState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { profile: null, pendingFriendRequests: 0 };
  }

  const [profileRow, { count, error: countError }, { data: userAchievements }] =
    await Promise.all([
      loadNavbarProfile(supabase, user.id),
      supabase
        .from("friendships")
        .select("*", { count: "exact", head: true })
        .eq("friend_id", user.id)
        .eq("status", "pending"),
      supabase
        .from("user_achievements")
        .select("achievement_id")
        .eq("user_id", user.id),
    ]);

  let achievementSlugs: string[] = [];
  const achievementIds = (userAchievements ?? []).map((row) => row.achievement_id);
  if (achievementIds.length > 0) {
    const { data: achievementRows } = await supabase
      .from("achievements")
      .select("slug")
      .in("id", achievementIds);
    achievementSlugs = (achievementRows ?? []).map((row) => row.slug);
  }

  if (countError) {
    console.error("getNavbarAuthState friend count:", countError.message);
  }

  if (!profileRow) {
    return { profile: null, pendingFriendRequests: count ?? 0 };
  }

  return {
    profile: {
      username: profileRow.username,
      displayName: profileRow.display_name,
      avatarUrl: profileRow.avatar_url,
      isAdmin: profileRow.is_admin ?? false,
      planTier: profileRow.plan_tier,
      premiumUntil: profileRow.premium_until,
      premiumSource: profileRow.premium_source,
      achievementSlugs,
    },
    pendingFriendRequests: count ?? 0,
  };
}
