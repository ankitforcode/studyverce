import type { PlanTier, PremiumSource, ProfileEntitlement } from "@studyverce/shared";
import { resolveEffectivePlanTier } from "@studyverce/shared";

export type ProfileEntitlementRow = {
  plan_tier: PlanTier;
  premium_until: string | null;
  premium_source: PremiumSource;
};

export function profileRowToEntitlement(row: ProfileEntitlementRow): ProfileEntitlement {
  return {
    planTier: row.plan_tier,
    premiumUntil: row.premium_until,
    premiumSource: row.premium_source ?? "free",
  };
}

export function resolveEffectivePlanTierFromRow(
  row: ProfileEntitlementRow,
  now?: Date
): PlanTier {
  return resolveEffectivePlanTier(profileRowToEntitlement(row), now);
}

export const PROFILE_ENTITLEMENT_SELECT =
  "plan_tier, premium_until, premium_source" as const;

export const PROFILE_NAVBAR_SELECT =
  `${PROFILE_ENTITLEMENT_SELECT}, username, display_name, avatar_url, is_admin` as const;

export const PROFILE_LEGACY_SELECT =
  "plan_tier, username, display_name, avatar_url, is_admin" as const;

export function legacyProfileToEntitlementRow(row: {
  plan_tier: PlanTier;
}): ProfileEntitlementRow {
  return {
    plan_tier: row.plan_tier,
    premium_until: null,
    premium_source: "free",
  };
}
