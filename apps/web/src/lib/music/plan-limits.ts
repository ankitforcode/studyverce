import type { PlanTier } from "@studyverce/shared";
import { PLAN_LIMITS } from "@studyverce/shared";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type MusicLibraryLimits = {
  planTier: PlanTier;
  linkLimit: number | null;
  linksUsed: number;
  linksRemaining: number | null;
  streamingIntegrationEnabled: boolean;
};

export function getMusicPlanLimits(planTier: PlanTier | null | undefined) {
  const tier = planTier ?? "free";
  const limits = PLAN_LIMITS[tier];

  return {
    planTier: tier,
    linkLimit: limits.maxUserMusicLinks,
    streamingIntegrationEnabled: limits.streamingIntegration,
  };
}

export async function fetchUserPlanTier(
  supabase: SupabaseServerClient,
  userId: string
): Promise<PlanTier> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", userId)
    .maybeSingle();

  return (profile?.plan_tier ?? "free") as PlanTier;
}

export async function countUserMusicLinks(
  supabase: SupabaseServerClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("room_tracks")
    .select("id", { count: "exact", head: true })
    .eq("uploaded_by", userId)
    .eq("is_builtin", false);

  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function buildMusicLibraryLimits(
  planTier: PlanTier,
  linksUsed: number
): MusicLibraryLimits {
  const plan = getMusicPlanLimits(planTier);

  return {
    planTier,
    linkLimit: plan.linkLimit,
    linksUsed,
    linksRemaining:
      plan.linkLimit === null ? null : Math.max(0, plan.linkLimit - linksUsed),
    streamingIntegrationEnabled: plan.streamingIntegrationEnabled,
  };
}

export async function getMusicLibraryLimitsForUser(
  supabase: SupabaseServerClient,
  userId: string
): Promise<MusicLibraryLimits> {
  const [planTier, linksUsed] = await Promise.all([
    fetchUserPlanTier(supabase, userId),
    countUserMusicLinks(supabase, userId),
  ]);

  return buildMusicLibraryLimits(planTier, linksUsed);
}

export function musicLinkLimitError(limits: MusicLibraryLimits): string {
  return `Free plan limit reached (${limits.linkLimit} music links). Delete a track in My Links before adding another, or upgrade to Premium for unlimited links.`;
}

export function streamingIntegrationError(): string {
  return "Spotify, YouTube Music, and Apple Music integration requires a Premium or Institution plan. Upgrade on the Plans page, or add SoundCloud links via Paste link on the Free plan.";
}

export async function assertCanAddMusicLink(
  supabase: SupabaseServerClient,
  userId: string
): Promise<
  | { ok: true; limits: MusicLibraryLimits }
  | { ok: false; error: string; limits: MusicLibraryLimits }
> {
  const limits = await getMusicLibraryLimitsForUser(supabase, userId);

  if (limits.linkLimit !== null && limits.linksRemaining !== null && limits.linksRemaining <= 0) {
    return { ok: false, error: musicLinkLimitError(limits), limits };
  }

  return { ok: true, limits };
}

export async function assertStreamingIntegrationAllowed(
  supabase: SupabaseServerClient,
  userId: string
): Promise<
  | { ok: true; limits: MusicLibraryLimits }
  | { ok: false; error: string; limits: MusicLibraryLimits }
> {
  const limits = await getMusicLibraryLimitsForUser(supabase, userId);

  if (!limits.streamingIntegrationEnabled) {
    return { ok: false, error: streamingIntegrationError(), limits };
  }

  return { ok: true, limits };
}
