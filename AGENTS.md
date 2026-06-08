# StudyVerce — Agent Guide

Discord-style virtual study rooms with pomodoro, chat, music, wallpapers, and **personal post-it tasks** (room-scoped, per-user).

## Monorepo

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js 16 app (port **3001**) |
| `packages/shared` | Shared types (`UserPostItTask`, `PostItItem`, colors, etc.) |
| `packages/db` | Database package |
| `packages/redis` | Shared Redis client, cache keys, invalidation helpers |
| `supabase/migrations/` | Postgres schema + RLS |

Commands: `pnpm dev`, `pnpm typecheck`, `supabase db push`.

## Where to look

| Feature | Primary files |
|---------|----------------|
| Post-it notes | `apps/web/src/components/dashboard/post-it-*.tsx`, `room/room-post-it-*.tsx` |
| Post-it data | `apps/web/src/app/dashboard/task-actions.ts`, `lib/post-it-{client,mapper,utils}.ts` |
| Room page | `apps/web/src/components/room/room-client.tsx` |
| Participant menu | `apps/web/src/components/room/participant-list.tsx` |
| Friends list | `apps/web/src/app/friends/page.tsx`, `components/friends/friends-directory.tsx` |
| Friends / kick | `apps/web/src/app/friends/actions.ts`, `apps/web/src/app/rooms/member-actions.ts` |
| Favorites / share | `apps/web/src/app/rooms/favorite-actions.ts`, `room/room-favorite-button.tsx`, `room/room-share-link.tsx` |
| Room listing | `apps/web/src/components/rooms/rooms-directory.tsx`, `lib/rooms/listing.ts`, `lib/cache/listing.ts` |
| Redis caching | `packages/redis/`, `packages/rate-limit/`, `apps/socket-server/src/redis-cache.ts`, `apps/web/src/lib/redis.ts` |
| Auth & session | `apps/web/src/app/auth/`, `app/settings/account/`, `lib/auth/`, `middleware.ts`, `components/layout/navbar*.tsx`, `supabase/templates/` |
| Room email invite | `apps/web/src/app/rooms/invite-actions.ts`, `components/room/room-share-link.tsx` |
| Rate limits | `packages/rate-limit/src/limiter.ts`, `shouldRateLimitRequest()` in `config.ts` |
| Room UI tokens | `apps/web/src/lib/room-ui.ts` |
| Todo sidebar | `apps/web/src/components/room/room-todo-panel.tsx` |
| Dashboard shell | `apps/web/src/components/dashboard/dashboard-*.tsx` |
| Navbar | `apps/web/src/components/layout/navbar.tsx`, `navbar-interactive.tsx` |

## Cursor memory

- **Rules**: `.cursor/rules/*.mdc` — auto-applied conventions by file type
- **Skills**: `.cursor/skills/*/SKILL.md` — deep workflows (index: `.cursor/skills/README.md`)
- **Maintenance**: rule `skills-maintenance.mdc` — update skills/rules/AGENTS when features change

Read the relevant skill **before** changing post-its, room UI, auth/middleware, Redis, or migrations. Update that skill **in the same task** when you add or materially change a feature (see rule `skills-maintenance.mdc` — checklist required before finishing).

## Non-negotiables

1. Post-its are **per-user + per-room** (RLS on `user_id`); never show one user's notes to others.
2. Post-its live on the **room page only** — not the dashboard board.
3. Shared types live in `packages/shared`; map DB rows in `post-it-mapper.ts` (snake_case → camelCase).
4. New DB columns need a migration in `supabase/migrations/` and updates to `database.types.ts`, mapper, and shared types.
5. Room overlay: pomodoro/timer uses `pointer-events-none` on wrappers; interactive children use `pointer-events-auto`.
6. Minimize diff scope; match existing patterns in surrounding files.
7. **Skills stay current**: after feature work, update the matching skill (`SKILL.md`, `reference.md`), relevant `.mdc` rule, and this file’s “Where to look” table if needed.

## Next.js (web app)

See `apps/web/AGENTS.md` — this project uses Next.js 16 with breaking changes vs older docs. Check `node_modules/next/dist/docs/` when unsure.
