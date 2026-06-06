"use server";

import { revalidatePath } from "next/cache";
import type { PlanTier } from "@studyverce/shared";
import { requireAdminSession } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();

  if (!isAdmin) {
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_admin", true);

    if (countError) {
      return { error: countError.message };
    }

    const { data: target } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", userId)
      .single();

    if (target?.is_admin && (count ?? 0) <= 1) {
      return { error: "At least one admin account must remain." };
    }
  }

  const { error } = await supabase
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

export async function deleteAdminUser(
  _prev: { error: string | null; success?: boolean },
  formData: FormData
): Promise<{ error: string | null; success?: boolean }> {
  const admin = await requireAdminSession();
  const userId = String(formData.get("userId") ?? "");

  if (!userId) return { error: "Missing user id." };
  if (userId === admin.userId) {
    return { error: "You cannot delete your own account." };
  }

  const supabase = await createClient();

  const { data: target } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();

  if (target?.is_admin) {
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_admin", true);

    if (countError) {
      return { error: countError.message };
    }

    if ((count ?? 0) <= 1) {
      return { error: "At least one admin account must remain." };
    }
  }

  try {
    const service = createServiceClient();
    const { error } = await service.auth.admin.deleteUser(userId);

    if (error) {
      return { error: error.message };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete user.";
    return { error: message };
  }

  revalidatePath("/admin/users");
  revalidatePath("/leaderboard");
  return { error: null, success: true };
}
