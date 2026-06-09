# StudyVerce Cursor skills

Deep workflows for agents. **Read the matching skill before editing; update it when you add or change features** (see rule `skills-maintenance.mdc` — **checklist required before finishing every task**).

## Skill index

| Skill | Path | Use when |
|-------|------|----------|
| Rooms | `studyverce-rooms/SKILL.md` | Room page, header, participant menu, music/wallpaper, listing, favorites, friends/kick, socket realtime |
| Auth & session | `studyverce-auth/SKILL.md` | Login/signup/reset, middleware, navbar, Supabase email templates |
| Redis & rate limits | `studyverce-redis/SKILL.md` | `packages/redis`, `packages/rate-limit`, socket caches, Upstash budget |
| Post-it notes | `studyverce-post-it-notes/SKILL.md` | Room post-its, `task-actions`, schema, todo panel sync |
| Dashboard | `studyverce-dashboard/SKILL.md` | Dashboard shell, stats, calendar, charts (no post-it canvas) |
| Legal & SEO | `studyverce-legal/SKILL.md` | Privacy/Terms content, footer links, signup disclosures, robots/sitemap, OAuth consent URLs |
| Referrals & rewards | `studyverce-referrals/SKILL.md` | Referral links, milestone grants, Premium entitlements, badges, `/settings/referrals` |

Each skill may include `reference.md` for file/action/migration tables.

Friends list: `app/friends/page.tsx` + `friends/actions.ts` (also covered in `studyverce-rooms`).

## Maintenance workflow

1. Use the **trigger table** in `.cursor/rules/skills-maintenance.mdc` to pick skill(s) and rules.
2. Read skill(s) **before** coding.
3. Implement the change following documented pitfalls.
4. Update skill `SKILL.md` + `reference.md`, rules, and `AGENTS.md` as needed.
5. Complete the **before finishing** checklist in `skills-maintenance.mdc` (middleware static matcher, Redis hot paths, no stale docs).

## Scoped rules (auto-applied by glob)

| Rule | Globs |
|------|-------|
| `nextjs-web.mdc` | `apps/web/**` |
| `auth-platform.mdc` | middleware, auth, navbar, supabase templates |
| `redis-rate-limit.mdc` | redis packages, socket cache, web cache |
| `room-features.mdc` | room components |
| `post-it-notes.mdc` | post-it files |
| `supabase-migrations.mdc` | migrations |
| `studyverce-legal.mdc` | legal content, privacy/terms pages, robots, sitemap |

## Related agent memory

- **Always-on**: `studyverce-overview.mdc`, `skills-maintenance.mdc`
- **Root guide**: `AGENTS.md`
