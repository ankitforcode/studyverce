# StudyVerce — Agent Guide

Discord-style virtual study rooms with pomodoro, chat, music, wallpapers, and **personal post-it tasks** (room-scoped, per-user).

## Monorepo

| Path | Purpose |
|------|---------|
| `apps/web` | Next.js 16 app (port **3001**) |
| `packages/shared` | Shared types (`UserPostItTask`, `PostItItem`, colors, etc.) |
| `packages/db` | Database package |
| `supabase/migrations/` | Postgres schema + RLS |

Commands: `pnpm dev`, `pnpm typecheck`, `supabase db push`.

## Where to look

| Feature | Primary files |
|---------|----------------|
| Post-it notes | `apps/web/src/components/dashboard/post-it-*.tsx`, `room/room-post-it-*.tsx` |
| Post-it data | `apps/web/src/app/dashboard/task-actions.ts`, `lib/post-it-{client,mapper,utils}.ts` |
| Room page | `apps/web/src/components/room/room-client.tsx` |
| Todo sidebar | `apps/web/src/components/room/room-todo-panel.tsx` |
| Dashboard shell | `apps/web/src/components/dashboard/dashboard-*.tsx` |
| Navbar | `apps/web/src/components/layout/navbar.tsx` |

## Cursor memory

- **Rules**: `.cursor/rules/*.mdc` — auto-applied conventions by file type
- **Skills**: `.cursor/skills/*/SKILL.md` — deep workflows (post-its, rooms, Supabase)

Read the relevant skill before changing post-its, room UI, or migrations.

## Non-negotiables

1. Post-its are **per-user + per-room** (RLS on `user_id`); never show one user's notes to others.
2. Post-its live on the **room page only** — not the dashboard board.
3. Shared types live in `packages/shared`; map DB rows in `post-it-mapper.ts` (snake_case → camelCase).
4. New DB columns need a migration in `supabase/migrations/` and updates to `database.types.ts`, mapper, and shared types.
5. Room overlay: pomodoro/timer uses `pointer-events-none` on wrappers; interactive children use `pointer-events-auto`.
6. Minimize diff scope; match existing patterns in surrounding files.

## Next.js (web app)

See `apps/web/AGENTS.md` — this project uses Next.js 16 with breaking changes vs older docs. Check `node_modules/next/dist/docs/` when unsure.
