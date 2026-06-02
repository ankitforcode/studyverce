import type { PlanTier } from "@studyverse/shared";
import { PLAN_LIMITS, FEATURE_FLAGS } from "@studyverse/shared";

export function canCreatePrivateRoom(planTier: PlanTier, currentPrivateRoomCount: number): boolean {
  return currentPrivateRoomCount < PLAN_LIMITS[planTier].maxPrivateRooms;
}

export function hasAiAccess(planTier: PlanTier): boolean {
  return PLAN_LIMITS[planTier].aiFeatures && FEATURE_FLAGS.aiStudyPlanner;
}

export function hasAdvancedAnalytics(planTier: PlanTier): boolean {
  return PLAN_LIMITS[planTier].advancedAnalytics;
}

export function isPremium(planTier: PlanTier): boolean {
  return planTier === "premium" || planTier === "institution";
}

/** Phase 2 stub — Stripe subscription webhook handler */
export async function handleSubscriptionWebhook(_payload: unknown): Promise<void> {
  throw new Error("Stripe billing is not enabled yet. Coming in Phase 2.");
}
