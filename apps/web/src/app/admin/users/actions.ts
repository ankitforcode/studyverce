"use server";

import { revalidatePath } from "next/cache";
import type { PlanTier } from "@studyverce/shared";
import { requireAdminSession } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";

const PLAN_TIERS: PlanTier[] = ["free", "premium", "institution"];

export async function updateAdminUser(
  _prev: { error: string | null; success?: boolean },
  formData: FormData
): Promise<{ error: string | null; success?: boolean }> {
  const admin = await requireAdminSession();
  const userId = String(formData.get("userId") ?? "");
  const username = String(formData.get("username") ?? "").trim();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const planTier = String(formData.get("plan_tier") ?? "free") as PlanTier;
  const isAdmin = formData.get("is_admin") === "on";
  const onboardingCompleted = formData.get("onboarding_completed") === "on";

  if (!userId) return { error: "Missing user id." };
  if (!username || username.length < 3 || username.length > 30) {
    return { error: "Username must be 3–30 characters." };
  }
  if (!displayName) return { error: "Display name is required." };
  if (!PLAN_TIERS.includes(planTier)) return { error: "Invalid plan tier." };

  if (userId === admin.userId && !isAdmin) {
    return { error: "You cannot remove your own admin access." };
  }

  const service = createServiceClient();

  if (!isAdmin) {
    const { count, error: countError } = await service
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_admin", true);

    if (countError) {
      return { error: countError.message };
    }

    const { data: target } = await service
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (target?.is_admin && (count ?? 0) <= 1) {
      return { error: "At least one admin account must remain." };
    }
  }

  const { error } = await service
    .from("profiles")
    .update({
      username,
      display_name: displayName,
      plan_tier: planTier,
      is_admin: isAdmin,
      onboarding_completed: onboardingCompleted,
    })
    .eq("id", userId);

  if (error) {
    if (error.code === "23505") {
      return { error: "That username is already taken." };
    }
    return { error: error.message };
  }

  revalidatePath("/admin/users");
  revalidatePath("/leaderboard");
  return { error: null, success: true };
}
