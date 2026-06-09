"use server";

import { revalidatePath } from "next/cache";
import { REFERRAL_MILESTONES } from "@studyverce/shared";
import { createClient } from "@/lib/supabase/server";
import { buildReferralLink } from "@/lib/referrals/capture";
import { resolveEffectivePlanTierFromRow } from "@/lib/referrals/entitlements";
import { getSiteUrl } from "@/lib/site-metadata";

export type ReferralInviteRow = {
  id: string;
  status: "pending" | "qualified" | "rejected";
  qualifiedAt: string | null;
  createdAt: string;
  refereeUsername: string | null;
  refereeDisplayName: string | null;
};

export type ReferralsPageData = {
  referralCode: string;
  referralLink: string;
  qualifiedCount: number;
  pendingCount: number;
  milestones: typeof REFERRAL_MILESTONES;
  invites: ReferralInviteRow[];
  rewardsGranted: string[];
  effectivePlanTier: "free" | "premium" | "institution";
  planTier: "free" | "premium" | "institution";
  premiumUntil: string | null;
  premiumSource: string;
};

export async function getReferralsPageData(): Promise<ReferralsPageData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: referrals }, { data: rewards }] = await Promise.all([
    supabase
      .from("profiles")
      .select("referral_code, plan_tier, premium_until, premium_source")
      .eq("id", user.id)
      .single(),
    supabase
      .from("referrals")
      .select("id, status, qualified_at, created_at, referee_id")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("referral_rewards")
      .select("reward_type")
      .eq("user_id", user.id),
  ]);

  if (!profile) return null;

  const refereeIds = (referrals ?? []).map((row) => row.referee_id);
  const { data: referees } =
    refereeIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", refereeIds)
      : { data: [] as { id: string; username: string; display_name: string }[] };

  const refereeById = new Map((referees ?? []).map((r) => [r.id, r]));

  const appOrigin = getSiteUrl();
  const invites: ReferralInviteRow[] = (referrals ?? []).map((row) => {
    const referee = refereeById.get(row.referee_id);
    return {
      id: row.id,
      status: row.status as ReferralInviteRow["status"],
      qualifiedAt: row.qualified_at,
      createdAt: row.created_at,
      refereeUsername: referee?.username ?? null,
      refereeDisplayName: referee?.display_name ?? null,
    };
  });

  const qualifiedCount = invites.filter((i) => i.status === "qualified").length;
  const pendingCount = invites.filter((i) => i.status === "pending").length;

  return {
    referralCode: profile.referral_code,
    referralLink: buildReferralLink(appOrigin, profile.referral_code),
    qualifiedCount,
    pendingCount,
    milestones: REFERRAL_MILESTONES,
    invites,
    rewardsGranted: (rewards ?? []).map((r) => r.reward_type),
    effectivePlanTier: resolveEffectivePlanTierFromRow(profile),
    planTier: profile.plan_tier,
    premiumUntil: profile.premium_until,
    premiumSource: profile.premium_source,
  };
}

export async function copyReferralLinkAction(): Promise<{ link: string | null }> {
  const data = await getReferralsPageData();
  return { link: data?.referralLink ?? null };
}

export async function revalidateReferralsPage() {
  revalidatePath("/settings/referrals");
  revalidatePath("/dashboard");
}
