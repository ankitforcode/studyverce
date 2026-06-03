<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# StudyVerce web app

Monorepo root guide: [`../../AGENTS.md`](../../AGENTS.md)

## Cursor memory (repo root)

- **Rules**: `../../.cursor/rules/` — post-its, rooms, Supabase, overview
- **Skills**: `../../.cursor/skills/` — `studyverce-post-it-notes`, `studyverce-rooms`, `studyverce-dashboard`

Load the skill that matches your task before editing related files.

## App specifics

- **Post-it lazy persist**: with `REDIS_URL` set, edits cache in Redis and flush to Postgres after `POST_IT_FLUSH_DEBOUNCE_MS` (default 2000). Disable via `POST_IT_LAZY_PERSIST=false`. Close/delete/reopen flush immediately.
- Dev server: **port 3001** (`pnpm --filter web dev`)
- Path alias: `@/` → `apps/web/src`
- Server actions in `src/app/**`; client room/post-it code in `src/components/`
