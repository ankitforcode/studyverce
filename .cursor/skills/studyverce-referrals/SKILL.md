---
name: studyverce-referrals
description: StudyVerce referral and rewards program — referral links, milestone grants (3/10/25 invites), Premium entitlements, badges, and settings UI. Use when editing referrals schema, capture flow, onboarding qualification, or reward fulfillment.
---

# StudyVerce referrals & rewards

## Qualification rule

A referral counts when a **new user signs up with `?ref=` (or cookie/metadata) and completes onboarding** (`profiles.onboarding_completed = true`).

## Milestones (referrer)

| Qualified invites | Reward |
|-------------------|--------|
| 3 | 1 month Premium (`premium_until` extension) |
| 10 | Ambassador badge (`achievements.referrals_10`) |
| 25 | Lifetime Premium (`premium_source = referral_lifetime`) |

**Referee:** 7-day Premium trial on onboarding complete.

## Effective Premium

Single resolver: `resolveEffectivePlanTier()` in `@studyverce/shared`, wired via `fetchUserPlanTier()` in `lib/plan-limits.ts`.

Order: institution → lifetime referral → admin `plan_tier` premium → active `premium_until` → free.

## Key files

| Area | Path |
|------|------|
| Migration + RPCs | `supabase/migrations/20250610000000_referrals_rewards.sql` |
| Capture / cookie | `lib/referrals/capture.ts`, `components/referrals/referral-capture.tsx` |
| Grants (service RPC) | `lib/referrals/rewards.ts` |
| Entitlements | `lib/referrals/entitlements.ts` |
| Settings UI | `app/settings/referrals/` |
| Onboarding hook | `app/onboarding/actions.ts` → `qualify_referral_and_grant_rewards` |
| Signup metadata | `app/auth/signup/page.tsx`, `auth/callback/route.ts` |
| Badges | `components/profile/user-badge-strip.tsx` |
| Legal | `lib/legal/terms-content.ts` (`referral-program`), privacy collect bullets |

## Pitfalls

- Users cannot self-update `referral_code`, `premium_until`, `premium_source`, or `referred_by_user_id` (RLS trigger).
- Reward grants are idempotent via `referral_rewards` unique `(user_id, reward_type)`.
- `attach_referral` / qualification RPCs are **service_role only** — call from server actions, not client Supabase.
- Sync `referral_code` to username on onboarding via `sync_referral_code_for_username`.
- Study achievements grant in `update_profile_stats()` — no separate app INSERT path.

## Checklist when changing behavior

1. Update this skill + `reference.md` if milestones or rules change.
2. Bump legal `*_LAST_UPDATED` if user-facing program terms change.
3. Run `pnpm --filter web exec tsc --noEmit`.
4. Update `AGENTS.md` row if primary files move.
