# Auth reference

## Routes

| Route | File | Notes |
|-------|------|-------|
| `/auth/login` | `app/auth/login/page.tsx` | |
| `/auth/signup` | `app/auth/signup/page.tsx` | Email confirmation gate |
| `/auth/forgot-password` | `app/auth/forgot-password/page.tsx` | |
| `/auth/reset-password` | `app/auth/reset-password/page.tsx` | Session required; toast on success |
| `/auth/callback` | `app/auth/callback/route.ts` | OAuth + email verify; rate limited |

## Auth helpers

| File | Role |
|------|------|
| `lib/auth/paths.ts` | `safeRedirectPath`, `loginPath`, `resolvePostAuthDestination`; allowlists `/auth/reset-password` |
| `lib/auth/middleware-routes.ts` | `isProtectedAppPath()` — keep aligned with `middleware.ts` matcher |
| `lib/supabase/middleware.ts` | `updateSession()` — `getUser()` on matcher routes only |
| `app/auth/navbar-actions.ts` | `getNavbarAuthState()` — profile + friend count (client-deferred) |
| `app/auth/actions.ts` | `signOutAction` |

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
| `supabase/config.toml` | `[auth.email.template.confirmation]`, `[auth.email.template.recovery]` |
| `apps/web/public/logo-email.svg` | Source for inline email logo |
| `scripts/sync-email-logo.sh` | Regenerate PNG from SVG |

## Notifications

| Message | File |
|---------|------|
| `passwordResetSuccess()` | `lib/notifications/messages.ts` |
