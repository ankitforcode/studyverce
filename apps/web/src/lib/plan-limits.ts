import type { PlanTier } from "@studyverce/shared";
import { FREE_MAX_ROOM_PARTICIPANTS, PLAN_LIMITS } from "@studyverce/shared";
import type { createClient } from "@/lib/supabase/server";
import {
  legacyProfileToEntitlementRow,
  PROFILE_ENTITLEMENT_SELECT,
  PROFILE_LEGACY_SELECT,
  resolveEffectivePlanTierFromRow,
  type ProfileEntitlementRow,
} from "@/lib/referrals/entitlements";

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

export type { ProfileEntitlementRow };
export { PROFILE_ENTITLEMENT_SELECT, resolveEffectivePlanTierFromRow };

export function getPlanTierOrFree(planTier: PlanTier | null | undefined): PlanTier {
  return planTier ?? "free";
}

export function getPlanMaxRoomParticipants(planTier: PlanTier | null | undefined): number | null {
  return PLAN_LIMITS[getPlanTierOrFree(planTier)].maxRoomParticipants;
}

/** Effective room capacity = min(room setting, free-plan cap when owner is on Free). */
export function getEffectiveMaxParticipants(
  ownerPlanTier: PlanTier | null | undefined,
  roomMaxParticipants: number
): number {
  const planCap = getPlanMaxRoomParticipants(ownerPlanTier);
  if (planCap === null) return roomMaxParticipants;
  return Math.min(roomMaxParticipants, planCap);
}

export function roomParticipantLimitError(
  ownerPlanTier: PlanTier | null | undefined
): string {
  const cap = getPlanMaxRoomParticipants(ownerPlanTier);
  if (cap === null) return "This room is full.";
  return `This room is full (${cap} participants on the Free plan). The room owner can upgrade to Premium for larger study groups.`;
}

export function hasRoomVideo(planTier: PlanTier | null | undefined): boolean {
  return PLAN_LIMITS[getPlanTierOrFree(planTier)].roomVideo;
}

export function hasVoiceNotes(planTier: PlanTier | null | undefined): boolean {
  return PLAN_LIMITS[getPlanTierOrFree(planTier)].voiceNotes;
}

export function voiceNotesUpgradeError(): string {
  return "Voice notes — record, share with the room, and transcribe — require Premium or Institution. Upgrade on the Plans page.";
}

export function roomVideoUpgradeError(): string {
  return "In-room video streaming requires Premium or Institution. Upgrade on the Plans page.";
}

export async function fetchUserEntitlement(
  supabase: SupabaseServerClient,
  userId: string
): Promise<ProfileEntitlementRow | null> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select(PROFILE_ENTITLEMENT_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (!error && profile) {
    return profile as ProfileEntitlementRow;
  }

  if (error) {
    console.error("fetchUserEntitlement:", error.message);
  }

  const { data: legacyProfile } = await supabase
    .from("profiles")
    .select(PROFILE_LEGACY_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (!legacyProfile) return null;
  return legacyProfileToEntitlementRow(legacyProfile);
}

export async function fetchUserPlanTier(
  supabase: SupabaseServerClient,
  userId: string
): Promise<PlanTier> {
  const profile = await fetchUserEntitlement(supabase, userId);
  if (!profile) return "free";
  return resolveEffectivePlanTierFromRow(profile);
}

export async function fetchRoomOwnerPlanTier(
  supabase: SupabaseServerClient,
  ownerId: string
): Promise<PlanTier> {
  return fetchUserPlanTier(supabase, ownerId);
}

export async function assertRoomHasMemberCapacity(
  supabase: SupabaseServerClient,
  roomId: string
): Promise<{ ok: true; effectiveMax: number } | { ok: false; error: string }> {
  const { data: room } = await supabase
    .from("study_rooms")
    .select("max_participants, owner_id")
    .eq("id", roomId)
    .maybeSingle();

  if (!room) return { ok: false, error: "Room not found." };

  const ownerPlan = await fetchRoomOwnerPlanTier(supabase, room.owner_id);
  const effectiveMax = getEffectiveMaxParticipants(ownerPlan, room.max_participants);

  const { count, error } = await supabase
    .from("room_members")
    .select("room_id", { count: "exact", head: true })
    .eq("room_id", roomId);

  if (error) return { ok: false, error: error.message };

  if ((count ?? 0) >= effectiveMax) {
    return { ok: false, error: roomParticipantLimitError(ownerPlan) };
  }

  return { ok: true, effectiveMax };
}

export function capMaxParticipantsForPlan(
  planTier: PlanTier | null | undefined,
  requestedMax: number
): number {
  const planCap = getPlanMaxRoomParticipants(planTier);
  const normalized = Math.min(Math.max(requestedMax, 2), 100);
  if (planCap === null) return normalized;
  return Math.min(normalized, planCap);
}

export { FREE_MAX_ROOM_PARTICIPANTS };
