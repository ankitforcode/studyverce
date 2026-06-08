---
name: studyverce-auth
description: StudyVerce authentication — signup/login/reset flows, Supabase email templates, middleware session guards, navbar auth hydration, and password UX. Use when editing auth pages, auth/callback, middleware, navbar, supabase/templates, or password reset.
---

# StudyVerce auth & session

See [reference.md](reference.md) for routes, templates, and file table.

## Read this skill when touching

- `apps/web/src/middleware.ts` or `lib/supabase/middleware.ts`
- `lib/auth/paths.ts`, `lib/auth/middleware-routes.ts`
- `app/auth/**` (login, signup, forgot/reset password, callback, navbar-actions)
- `components/auth/**`, `components/layout/navbar*.tsx`
- `supabase/templates/*.html`, `supabase/config.toml` email template sections

## Middleware (TTFB + security)

**Next.js requires a static `config.matcher` array** in `middleware.ts` — literal strings only. Do **not** import or spread matcher paths from another file (Amplify/Turbopack build fails).

Keep matcher paths in sync with `isProtectedAppPath()` in `lib/auth/middleware-routes.ts`:

| Matcher route | Protected when unauthenticated |
|---------------|-------------------------------|
| `/dashboard/*`, `/settings/*`, `/admin/*` | Yes |
| `/rooms/new`, `/rooms/:slug`, `/rooms/:slug/invite` | Yes |
| `/friends`, `/notifications` | Yes |
| `/onboarding`, `/auth/*` | Session refresh / auth redirects only |
| `/`, `/rooms` (listing), `/leaderboard` | **Not** in matcher — no blocking `getUser()` |

**Allowed auth redirect:** `/auth/reset-password` must stay reachable while logged in (middleware + `safeRedirectPath` allowlist).

## Navbar (TTFB)

- `navbar.tsx` — static shell (logo only); **no** async `getUser()` on the server.
- `navbar-interactive.tsx` — client; loads `getNavbarAuthState()` after paint.
- Do not move profile/friend-count fetches back into the root layout server path.

## Email templates (Supabase)

| Template | File | Config key |
|----------|------|------------|
| Confirm signup | `supabase/templates/confirm-signup.html` | `[auth.email.template.confirmation]` |
| Reset password | `supabase/templates/reset-password.html` | `[auth.email.template.recovery]` |

- Logo: inline base64 in HTML (from `apps/web/public/logo-email.svg` via `./scripts/sync-email-logo.sh`).
- Plain-text fallbacks: matching `.txt` files for dashboard paste.
- Local preview: Inbucket `:54324`; restart Supabase after template edits.

## Signup / reset UX

- Signup with `enable_confirmations`: show “Check your email” when `signUp` returns no session.
- Reset: `resetPasswordForEmail` → callback with `next=/auth/reset-password`; toast on success via `notificationMessages.passwordResetSuccess()`.
- Password fields: use `components/auth/password-input.tsx` (animated eye toggle).

## Pitfalls

1. Adding `/auth/*` paths to `safeRedirectPath` blocklist without allowlisting recovery breaks reset flow.
2. Middleware redirect for logged-in users on `/auth/*` must exempt `/auth/reset-password`.
3. Duplicating matcher in a shared export breaks production build.
4. External logo URL in email (`{{ .SiteURL }}/logo-email.png`) fails in Inbucket without web app running — prefer inline base64.

## After changes — verify

Complete the checklist in `.cursor/rules/skills-maintenance.mdc` plus:

- [ ] Matcher literals in `middleware.ts` match `isProtectedAppPath()` intent
- [ ] `pnpm --filter web exec tsc --noEmit`
- [ ] Update this skill + `reference.md` if routes/templates/files changed
- [ ] Update `AGENTS.md` row if new primary entry point
