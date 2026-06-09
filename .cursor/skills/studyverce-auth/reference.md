# Auth reference

## Routes

| Route | File | Notes |
|-------|------|-------|
| `/auth/login` | `app/auth/login/page.tsx` | Password or magic link (`sendMagicLinkLogin` — Premium/Institution only); `resolvePostAuthDestination` after password sign-in |
| `/auth/reauthenticate` | `app/auth/reauthenticate/page.tsx` | `reauthenticate()` email; exempt from logged-in `/auth/*` redirect |
| `/settings/account` | `app/settings/account/page.tsx` + `components/settings/account-settings-form.tsx` | Email change, password, inline reauth |
| `/settings/profile` | `app/settings/profile/page.tsx` | Profile fields; shell in `app/settings/layout.tsx` |
| `/profile` | `app/profile/page.tsx` | Redirects signed-in user to `/profile/[username]` by user id (mobile nav avatar uses this — avoids stale username 404s) |
| `/profile/[username]` | `app/profile/[username]/page.tsx` | Public profile; normalizes username segment (lowercase, strips `@`) |
| `/onboarding` | `app/onboarding/page.tsx` | Server redirect when `onboarding_completed`; form in `components/onboarding/onboarding-form.tsx` |
| `/auth/signup` | `app/auth/signup/page.tsx` | Email confirmation gate; links to `/terms` and `/privacy` |
| `/auth/forgot-password` | `app/auth/forgot-password/page.tsx` | |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | Session required; toast on success |
| `/auth/accept-invite` | `app/auth/accept-invite/page.tsx` | New room invitees set password via `acceptInviteSetPassword` (sets `app_metadata.password_set`), then `post_auth_redirect` |
| `/auth/callback` | `app/auth/callback/route.ts` | OAuth + email verify; `next` query or `user_metadata.post_auth_redirect`; rate limited |

## Auth helpers

| File | Role |
|------|------|
| `lib/auth/paths.ts` | `safeRedirectPath`, `authCallbackUrl`, `accountSettingsPath`, `reauthenticatePath`, `resolvePostAuthDestination`; allowlists `/auth/reset-password`, `/auth/accept-invite` |
| `lib/auth/room-invite.ts` | `buildRoomInviteRedirectPath`, `userMustSetPassword` (reads `app_metadata.password_set`), invite metadata keys |
| `lib/auth/admin-users.ts` | `findAuthUserByEmail` (service role) — avoids double email on room invites |
| `lib/auth/errors.ts` | `formatAuthEmailRateLimitError` — 30s cooldown copy when Supabase returns `0 seconds` |
| `lib/supabase/anon.ts` | Server anon client for OTP/magic-link sends |
| `lib/auth/establish-session.ts` | Client `establishSessionFromUrl` — PKCE `code`, `token_hash`, implicit hash on invite landing |
| `app/rooms/invite-actions.ts` | `sendRoomEmailInvite` — lookup email first; new → `inviteUserByEmail` + `acceptInviteUrl()`; existing → magic link → room invite path |
| `lib/site-metadata.ts` | `getAppOrigin`, `resolveAuthRedirectOrigin` (callback / Amplify) |
| `lib/auth/middleware-routes.ts` | `isProtectedAppPath()` — keep aligned with `middleware.ts` matcher |
| `lib/supabase/middleware.ts` | `updateSession()` — `getUser()` on matcher routes only |
| `app/auth/navbar-actions.ts` | `getNavbarAuthState()` — profile + friend count (client-deferred) |
| `lib/auth/navbar-profile-sync.ts` | `notifyNavbarProfileUpdated()` — client event; navbar refetches/applies profile patch after onboarding or settings |
| `app/auth/actions.ts` | `signOutAction`, `acceptInviteSetPassword`, `sendMagicLinkLogin` (Premium/Institution gate; uniform response) |

## Layout

| File | Role |
|------|------|
| `components/layout/navbar.tsx` | Static header shell |
| `components/layout/navbar-interactive.tsx` | Client nav + auth buttons / profile menu |
| `components/auth/auth-page-shell.tsx` | Auth card layout |
| `components/auth/password-input.tsx` | Password + show/hide eye |

## Supabase email

| File | Subject |
|------|---------|
| `supabase/templates/confirm-signup.html` | Confirm your email — StudyVerce |
| `supabase/templates/reset-password.html` | Reset your password — StudyVerce |
| `supabase/templates/magic-link.html` | Sign in to StudyVerce |
| `supabase/templates/invite.html` | You're invited — StudyVerce |
| `supabase/templates/email-change.html` | Confirm your new email — StudyVerce |
| `supabase/templates/reauthentication.html` | Confirm it's you — StudyVerce |
| `supabase/config.toml` | `[auth.email.template.*]` keys; `[auth.email] max_frequency = "30s"` |
| `apps/web/public/logo-email.png` | Email logo asset (hosted at `https://www.studyverce.com/logo-email.png`) |
| `apps/web/public/logo-email.svg` | SVG source for PNG |
| `scripts/sync-email-logo.sh` | Regenerate PNG from SVG |

## Notifications

| Message | File |
|---------|------|
| `passwordResetSuccess()` | `lib/notifications/messages.ts` |
| `QueryToastHandler` | `components/notifications/query-toast-handler.tsx` — `?password_reset=success`, `?reauth=success`, `?email_change=pending` |
