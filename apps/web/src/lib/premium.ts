import type { PlanTier } from "@studyverce/shared";
import { PLAN_LIMITS } from "@studyverce/shared";
import {
  getStudyAssistantPlanLimits,
  hasTeamFeatures as hasTeamFeaturesForTier,
} from "@/lib/study-assistant-limits";

export function canCreatePrivateRoom(planTier: PlanTier, currentPrivateRoomCount: number): boolean {
  return currentPrivateRoomCount < PLAN_LIMITS[planTier].maxPrivateRooms;
}

export function hasTeamFeatures(planTier: PlanTier | null | undefined): boolean {
  return hasTeamFeaturesForTier(planTier);
}

export function hasAdvancedAnalytics(planTier: PlanTier): boolean {
  return PLAN_LIMITS[planTier].advancedAnalytics;
}

export function isPremium(planTier: PlanTier): boolean {
  return planTier === "premium" || planTier === "institution";
}

export function canUseMagicLinkLogin(planTier: PlanTier | null | undefined): boolean {
  if (!planTier) return false;
  return PLAN_LIMITS[planTier].magicLinkLogin;
}

export function getPlanLimitsSummary(planTier: PlanTier | null | undefined) {
  return getStudyAssistantPlanLimits(planTier);
}

/** Phase 2 stub — Stripe subscription webhook handler */
export async function handleSubscriptionWebhook(_payload: unknown): Promise<void> {
  throw new Error("Stripe billing is not enabled yet. Coming in Phase 2.");
}
