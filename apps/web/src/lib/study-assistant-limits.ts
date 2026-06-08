import type { PlanTier } from "@studyverce/shared";
import { PLAN_LIMITS } from "@studyverce/shared";

export type StudyAssistantPlanLimits = {
  planTier: PlanTier;
  teamFeatures: boolean;
  memoryEnabled: boolean;
  dailyPromptLimit: number | null;
};

export function getStudyAssistantPlanLimits(
  planTier: PlanTier | null | undefined
): StudyAssistantPlanLimits {
  const tier = planTier ?? "free";
  const limits = PLAN_LIMITS[tier];

  return {
    planTier: tier,
    teamFeatures: limits.teamFeatures,
    memoryEnabled: limits.aiConversationMemory,
    dailyPromptLimit: limits.aiDailyPromptsPerRoom,
  };
}

export function hasTeamFeatures(planTier: PlanTier | null | undefined): boolean {
  return getStudyAssistantPlanLimits(planTier).teamFeatures;
}

export function hasStudyAssistantMemory(
  planTier: PlanTier | null | undefined
): boolean {
  return getStudyAssistantPlanLimits(planTier).memoryEnabled;
}
