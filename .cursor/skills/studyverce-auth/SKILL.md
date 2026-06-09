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
- `navbar-interactive.tsx` — client; loads `getNavbarAuthState()` after paint; refreshes on route change, auth events, and `notifyNavbarProfileUpdated()` (onboarding/settings). Mobile hamburger includes Settings + Sign out (desktop profile menu is `hidden` below `sm`).
- Do not move profile/friend-count fetches back into the root layout server path.

## Email templates (Supabase)

| Template | File | Config key |
|----------|------|------------|
| Confirm signup | `supabase/templates/confirm-signup.html` | `[auth.email.template.confirmation]` |
| Reset password | `supabase/templates/reset-password.html` | `[auth.email.template.recovery]` |
| Magic link | `supabase/templates/magic-link.html` | `[auth.email.template.magic_link]` |
| Invite user | `supabase/templates/invite.html` | `[auth.email.template.invite]` |
| Change email | `supabase/templates/email-change.html` | `[auth.email.template.email_change]` |
| Reauthentication | `supabase/templates/reauthentication.html` | `[auth.email.template.reauthentication]` |

- Logo: hosted PNG at `https://www.studyverce.com/logo-email.png` (source asset: `apps/web/public/logo-email.png`, regenerate from SVG via `./scripts/sync-email-logo.sh`).
- Plain-text fallbacks: matching `.txt` files for dashboard paste.
- Local preview: Inbucket `:54324`; restart Supabase after template edits.

## Signup / reset UX

- Signup with `enable_confirmations`: show “Check your email” when `signUp` returns no session.
- Use `authCallbackUrl(redirect)` from `lib/auth/paths.ts` for all `emailRedirectTo` / OAuth `redirectTo` (reads `NEXT_PUBLIC_APP_URL`, not `window.location.origin`).
- Signup stores `data: { post_auth_redirect: redirect }` — callback reads this when Supabase drops the `next` query param.
- **Login + onboarding**: email login (`auth/login`) and `/auth/callback` both call `resolvePostAuthDestination()` after reading `profiles.onboarding_completed`. `/onboarding` is a server page that redirects completed profiles to `redirect` or `/dashboard`.
- **Seed admin** (`supabase/seed.sql`): `on_auth_user_created` inserts a default profile; seed **UPDATE**s that row so `admin@studyverce.local` has `onboarding_completed = true` (do not rely on `INSERT … ON CONFLICT` alone).
- Reset: `resetPasswordForEmail` → callback with `next=/auth/reset-password`; on success `window.location.assign("/dashboard?password_reset=success")` — `QueryToastHandler` shows the success toast (avoid `router.push`; sessionStorage pending toasts break under React Strict Mode).
- **Magic link login**: `/auth/login` tab → `sendMagicLinkLogin` in `app/auth/actions.ts` (Premium/Institution only; checks `profiles.plan_tier` via service role before `signInWithOtp`). Free users see upgrade prompt. Room invite magic links for existing users are unchanged (`invite-actions.ts`).
- **Room email invite**: `findAuthUserByEmail` first (no invite-then-magic-link double send). New users → `inviteUserByEmail` with `redirectTo: acceptInviteUrl()` (direct `/auth/accept-invite`, **not** `/auth/callback` — invite tokens are finished client-side via `establishSessionFromUrl`). Do **not** call `updateUserById` with a password after invite (invalidates the email link). Then `/auth/accept-invite` → `/rooms/.../invite` approval (skips onboarding). Existing users → `signInWithOtp` magic link → `/auth/callback` → `/rooms/.../invite`. `[auth.email] max_frequency = "30s"`; `formatAuthEmailRateLimitError` when Supabase reports `0 seconds`. Requires valid `SUPABASE_SERVICE_ROLE_KEY` for new-user invites (from `supabase status`).
- **Account settings** (`/settings/account`): `updateUser({ email })`, password change, `reauthenticate()` — middleware exempts `/auth/reauthenticate` while signed in.
- Password fields: use `components/auth/password-input.tsx` (animated eye toggle).

## Hosted Supabase URL config

Per [Supabase redirect URL docs](https://supabase.com/docs/guides/auth/redirect-urls):

| Setting | Local dev | Production (hosted) |
|---------|-----------|---------------------|
| **Site URL** | `http://localhost:3001` | `https://www.studyverce.com` |
| **Redirect URLs** | `http://localhost:3001/**` | `https://www.studyverce.com/auth/callback`, `https://www.studyverce.com/**`, apex variants |

- Set **Site URL** to the canonical origin (`www`); apex redirects to `www` but auth defaults use Site URL when `redirectTo` is missing.
- Include explicit `/auth/callback` plus `/**` wildcards for query strings (`?next=...`).
- Match `NEXT_PUBLIC_APP_URL` in Amplify to the same canonical origin.
- `/auth/callback` uses `NextResponse.redirect` (not `redirect()`) so session cookies survive the exchange; origin resolves via `x-forwarded-host` or `NEXT_PUBLIC_APP_URL`.

Wrong post-confirm URL (e.g. `https://localhost:3000/...`) means **Dashboard → Authentication → URL Configuration** still has the default Site URL.

## Pitfalls

1. Adding `/auth/*` paths to `safeRedirectPath` blocklist without allowlisting recovery breaks reset flow.
2. Middleware redirect for logged-in users on `/auth/*` must exempt `/auth/reset-password`, `/auth/accept-invite`, and `/auth/reauthenticate`.
3. Duplicating matcher in a shared export breaks production build.
4. `/auth/callback` must return `NextResponse.redirect` after `exchangeCodeForSession` — `redirect()` from `next/navigation` can drop auth cookies in route handlers.
5. After changing the logo SVG, run `./scripts/sync-email-logo.sh` and deploy `apps/web/public/logo-email.png` so the hosted URL stays in sync with templates.

## After changes — verify

Complete the checklist in `.cursor/rules/skills-maintenance.mdc` plus:

- [ ] Matcher literals in `middleware.ts` match `isProtectedAppPath()` intent
- [ ] `pnpm --filter web exec tsc --noEmit`
- [ ] Update this skill + `reference.md` if routes/templates/files changed
- [ ] Update `AGENTS.md` row if new primary entry point
