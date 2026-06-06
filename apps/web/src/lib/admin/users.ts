import type { PlanTier } from "@studyverce/shared";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type AdminUserRecord = {
  id: string;
  email: string | null;
  username: string;
  displayName: string;
  planTier: PlanTier;
  isAdmin: boolean;
  onboardingCompleted: boolean;
  studyStreak: number;
  totalFocusMinutes: number;
  createdAt: string;
};

async function loadAuthEmails(): Promise<Map<string, string>> {
  const emailById = new Map<string, string>();

  try {
    const service = createServiceClient();
    let page = 1;
    const perPage = 200;

    while (true) {
      const { data, error } = await service.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("listAdminUsers auth:", error.message);
        break;
      }

      for (const authUser of data.users) {
        if (authUser.email) {
          emailById.set(authUser.id, authUser.email);
        }
      }

      if (data.users.length < perPage) break;
      page += 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("listAdminUsers auth emails skipped:", message);
  }

  return emailById;
}

export async function listAdminUsers(): Promise<AdminUserRecord[]> {
  const supabase = await createClient();

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, plan_tier, is_admin, onboarding_completed, study_streak, total_focus_minutes, created_at"
    )
    .order("created_at", { ascending: false });

  if (profilesError) {
    console.error("listAdminUsers profiles:", profilesError.message);
    return [];
  }

  const emailById = await loadAuthEmails();

  return (profiles ?? []).map((row) => ({
    id: row.id,
    email: emailById.get(row.id) ?? null,
    username: row.username,
    displayName: row.display_name,
    planTier: row.plan_tier as PlanTier,
    isAdmin: row.is_admin,
    onboardingCompleted: row.onboarding_completed,
    studyStreak: row.study_streak,
    totalFocusMinutes: row.total_focus_minutes,
    createdAt: row.created_at,
  }));
}
