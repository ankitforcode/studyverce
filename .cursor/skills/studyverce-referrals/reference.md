# Referrals reference

## Tables

| Table | Purpose |
|-------|---------|
| `profiles.referral_code` | Shareable code (defaults to username after onboarding) |
| `profiles.referred_by_user_id` | Attribution |
| `profiles.premium_until` | Time-limited Premium |
| `profiles.premium_source` | `free`, `referral_trial`, `referral_reward`, `referral_lifetime`, `stripe`, `admin` |
| `referrals` | Referrer ↔ referee rows (`pending` → `qualified`) |
| `referral_rewards` | Idempotent grant ledger |

## RPCs (service_role)

| Function | When |
|----------|------|
| `attach_referral(referee_id, code)` | Signup / OAuth callback |
| `sync_referral_code_for_username(user_id, username)` | Onboarding username finalize |
| `qualify_referral_and_grant_rewards(referee_id)` | Onboarding complete |
| `evaluate_referrer_rewards(referrer_id)` | Called inside qualify |
| `grant_study_achievements(user_id)` | After `update_profile_stats` |

## Routes

| Path | Notes |
|------|-------|
| `/settings/referrals` | Link copy, progress, invite list |
| `/auth/signup?ref=` | Referral capture entry |

## Analytics (PostHog, consent-gated)

- `referral_link_copied`
- `referral_signup`
- `referral_qualified`

## Shared constants

`REFERRAL_MILESTONES`, `REFEREE_TRIAL_DAYS`, `REFERRER_PREMIUM_GRANT_DAYS` in `@studyverce/shared`.
