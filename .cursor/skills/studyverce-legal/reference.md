# Legal reference

## Files

| File | Role |
|------|------|
| `lib/legal/privacy-content.ts` | Privacy sections, `PRIVACY_LAST_UPDATED`, contact email |
| `lib/legal/terms-content.ts` | Terms sections, `TERMS_LAST_UPDATED`, contact email |
| `lib/legal/urls.ts` | Canonical `/privacy` and `/terms` paths + full URL helpers |
| `app/privacy/page.tsx` | Privacy route + metadata |
| `app/terms/page.tsx` | Terms route + metadata |
| `components/legal/legal-page-shell.tsx` | Shared layout, TOC anchors (`scroll-mt-24`) |
| `components/layout/site-footer.tsx` | Footer legal + product links |
| `app/auth/signup/page.tsx` | “By creating an account…” terms/privacy links |
| `app/robots.ts` | `/robots.txt` generation |
| `app/sitemap.ts` | `/sitemap.xml` public URLs |
| `app/manifest.ts` | Web app manifest |
| `app/opengraph-image.tsx` | Default social share image (1200×630) |
| `lib/seo/robots-disallow.ts` | Crawler disallow paths |
| `lib/seo/constants.ts` | SEO keywords + homepage FAQ copy |
| `lib/seo/structured-data.ts` | JSON-LD builders (Organization, FAQ, etc.) |
| `lib/site-metadata.ts` | `createSiteMetadata()`, canonical URLs, robots helpers |
| `components/seo/json-ld.tsx` | Renders `<script type="application/ld+json">` |

## Public URLs

| Page | Path | Production URL |
|------|------|----------------|
| Privacy Policy | `/privacy` | `https://www.studyverce.com/privacy` |
| Terms of Service | `/terms` | `https://www.studyverce.com/terms` |

## Privacy sections (`privacySections`)

| `id` | Title |
|------|-------|
| `overview` | Overview |
| `information-we-collect` | Information we collect |
| `how-we-use` | How we use information |
| `sharing` | How we share information |
| `cookies` | Cookies and similar technologies |
| `retention` | Data retention |
| `your-choices` | Your choices and rights |
| `security` | Security |
| `children` | Children |
| `international` | International users |
| `changes` | Changes to this policy |
| `contact` | Contact us |

## Terms sections (`termsSections`)

| `id` | Title |
|------|-------|
| `agreement` | Agreement to these terms |
| `eligibility` | Eligibility |
| `account` | Your account |
| `service` | The Service |
| `acceptable-use` | Acceptable use |
| `rooms-and-content` | Study rooms and your content |
| `third-party` | Third-party services |
| `billing` | Plans and billing |
| `intellectual-property` | Intellectual property |
| `ai-coach` | AI study coach disclaimer |
| `disclaimers` | Disclaimers |
| `liability` | Limitation of liability |
| `termination` | Suspension and termination |
| `changes` | Changes to these Terms |
| `governing-law` | Governing law |
| `contact` | Contact us |

## Feature → legal update triggers

| Product area | Primary files to check | Privacy sections | Terms sections |
|--------------|------------------------|------------------|----------------|
| Auth (email, Google OAuth, magic link) | `app/auth/*`, Supabase | `information-we-collect`, `cookies` | `account`, `third-party` |
| Profiles / public pages | `app/profile/*`, settings | `information-we-collect`, `sharing` | `rooms-and-content` |
| Study rooms / chat / presence | `room-client.tsx`, socket | `information-we-collect`, `sharing` | `service`, `rooms-and-content`, `acceptable-use` |
| Post-it tasks | `task-actions.ts`, RLS | `information-we-collect` (private per-user) | `rooms-and-content` |
| Pomodoro / focus analytics | dashboard, stats | `information-we-collect`, `how-we-use` | `service` |
| Leaderboard | `leaderboard/*` | `information-we-collect` | `service`, `acceptable-use` |
| Friends / notifications | `friends/*`, notifications | `information-we-collect`, `sharing` | `acceptable-use` |
| Music OAuth (Spotify, YT, Apple) | room music | `information-we-collect`, `sharing`, `cookies` | `third-party`, `acceptable-use` |
| AI study coach | `study-assistant-*` | `information-we-collect`, `sharing` | `ai-coach`, `acceptable-use` |
| PostHog analytics | `lib/analytics` | `cookies`, `how-we-use` | — |
| Email (transactional, invites) | `supabase/templates`, Resend | `information-we-collect`, `how-we-use` | `service` |
| Redis caching | `packages/redis` | `retention` (temporary cache) | — |
| Billing / subscriptions | future Stripe | `information-we-collect`, `sharing` | `billing` |
| Admin / moderation | `app/admin/*` | `how-we-use`, `sharing` | `termination`, `acceptable-use` |
| New protected route | `middleware-routes.ts` | — | — (+ `robots-disallow.ts`) |
| Landing / footer links | `page.tsx`, `site-footer.tsx` | — | — (link targets only) |

## Robots disallow paths

Aligned with `isProtectedAppPath()` plus auth flows:

- `/dashboard/`
- `/settings/`
- `/admin/`
- `/auth/`
- `/onboarding`
- `/friends`
- `/notifications`
- `/profile/`
- `/rooms/new`
- `/rooms/` (room slugs; `/rooms` listing remains allowed)

## Sitemap entries

`/`, `/rooms`, `/leaderboard`, `/privacy`, `/terms`

## Checklist (material app change)

- [ ] Scanned trigger map above for affected sections
- [ ] Updated `privacy-content.ts` and/or `terms-content.ts`
- [ ] Bumped `*_LAST_UPDATED` when copy materially changed
- [ ] Footer + signup still use `lib/legal/urls.ts`
- [ ] Google OAuth consent URLs still match production (if auth-related)
- [ ] `robots-disallow.ts` / `sitemap.ts` updated if routes changed
- [ ] `pnpm --filter web exec tsc --noEmit`
