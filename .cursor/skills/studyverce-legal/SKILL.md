---
name: studyverce-legal
description: StudyVerce legal pages — Privacy Policy, Terms of Service, footer links, signup disclosures, robots/sitemap, and Google OAuth consent URLs. Use when adding user data collection, third-party integrations, billing, AI features, or any product change that affects what users are told legally.
---

# StudyVerce legal pages

See [reference.md](reference.md) for file table, section IDs, and feature→legal trigger map.

## Read this skill when touching

- `apps/web/src/lib/legal/privacy-content.ts` or `terms-content.ts`
- `apps/web/src/app/privacy/page.tsx` or `terms/page.tsx`
- `apps/web/src/components/legal/legal-page-shell.tsx`
- `apps/web/src/components/layout/site-footer.tsx`
- `apps/web/src/app/auth/signup/page.tsx` (terms/privacy acceptance copy)
- `apps/web/src/app/robots.ts`, `sitemap.ts`, `lib/seo/robots-disallow.ts`
- `apps/web/src/lib/legal/urls.ts` (canonical paths for OAuth consent screen)

## Content architecture

- **Single source of truth**: section copy lives in `lib/legal/*-content.ts`, not in page components.
- Pages (`privacy/page.tsx`, `terms/page.tsx`) only wire metadata + `LegalPageShell` + section maps.
- **Last updated**: bump `PRIVACY_LAST_UPDATED` / `TERMS_LAST_UPDATED` whenever material policy/terms text changes (not typo-only fixes).
- **Contact emails**: `privacy@studyverce.com` (privacy), `legal@studyverce.com` (terms).

## When to update (required)

After **any material product or data-practice change**, check the trigger map in `reference.md`:

| Change type | Usually update |
|-------------|----------------|
| New data collected or new storage | Privacy → *Information we collect*, *Retention* |
| New third-party (AI, analytics, music, email) | Privacy → *Sharing*, *Cookies*; Terms → *Third-party* |
| New user-facing feature (chat, rooms, post-its, billing) | Both — describe capability and rules |
| Auth method change (Google OAuth, magic link) | Privacy → *Information we collect*; signup copy if disclosure needed |
| New public route worth indexing | `sitemap.ts`; confirm `robots.ts` still correct |
| New protected/private route | `lib/seo/robots-disallow.ts` if crawlers should not index it |

If unsure, update privacy **and** terms in the same PR — stale legal copy is worse than slightly verbose copy.

## Google OAuth consent screen

Privacy and Terms URLs shown in Google Cloud Console **must match** production:

- Privacy: `https://www.studyverce.com/privacy` (from `privacyPolicyUrl()`)
- Terms: `https://www.studyverce.com/terms` (from `termsOfServiceUrl()`)

Paths are defined once in `lib/legal/urls.ts`. If paths change, update Google OAuth consent + this skill.

## SEO (`robots.txt` / sitemap)

- `app/robots.ts` → `/robots.txt` (Next.js `MetadataRoute.Robots`)
- `app/sitemap.ts` → `/sitemap.xml`
- Disallow list: `lib/seo/robots-disallow.ts` — keep aligned with `isProtectedAppPath()` plus `/auth/` and `/onboarding`
- Public indexable pages: `/`, `/rooms`, `/leaderboard`, `/privacy`, `/terms`

Do **not** add authenticated room URLs (`/rooms/:slug`) to the sitemap.

## Editing workflow

1. Identify affected sections via `reference.md` trigger map.
2. Edit `privacy-content.ts` and/or `terms-content.ts` — use stable `id` slugs for anchor links.
3. Bump `*_LAST_UPDATED` for material changes.
4. Verify footer + signup links still point to `lib/legal/urls.ts` paths.
5. If new integration: name the provider explicitly in bullets (Supabase, PostHog, OpenAI, Spotify, etc.).
6. Run `pnpm --filter web exec tsc --noEmit`.
7. Update this skill / `reference.md` if you add a new recurring trigger or file.

## Pitfalls

- Do not hardcode `/privacy` or `/terms` in multiple files — import from `lib/legal/urls.ts`.
- Section `id` values are anchor targets in the on-page TOC; changing them breaks inbound links.
- Privacy must state what Google sign-in provides (profile/email for auth only) if OAuth is enabled.
- Terms *Acceptable use* and feature-specific disclaimers (AI coach, music) must reflect actual product guardrails in code.
- `robots` disallow `/rooms/` blocks room slugs but allows `/rooms` listing — intentional.

## Cross-skill handoff

- **Auth / signup UX** → also read `studyverce-auth` when changing signup disclosures or OAuth.
- **New room/social features** → read `studyverce-rooms`; update legal in the same task.
- **Post-its / per-user data** → read `studyverce-post-it-notes`; privacy must keep “private to your account” accurate.
- **Billing** → update Terms *Plans and billing* before shipping paid tiers.
