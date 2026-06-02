# StudyVerce Cursor memory

Persistent context for AI agents working in this repo.

## Rules (`.cursor/rules/`)

| File | When it applies |
|------|-----------------|
| `studyverce-overview.mdc` | Always — monorepo, commands, boundaries |
| `post-it-notes.mdc` | Post-it files, task-actions, migrations |
| `room-features.mdc` | `components/room/`, `app/rooms/` |
| `supabase-migrations.mdc` | `supabase/`, database types, mappers |
| `nextjs-web.mdc` | All `apps/web` TS/TSX |

## Skills (`.cursor/skills/`)

| Skill | Use for |
|-------|---------|
| `studyverce-post-it-notes` | Post-it UI, drag/resize, close/reopen, todo panel, schema |
| `studyverce-rooms` | Room page layout, overlays, chat, pomodoro, pointer events |
| `studyverce-dashboard` | Dashboard shell (no post-it board) |

Each skill may include `reference.md` with file maps and checklists.

## Entry points

- Repo: [`AGENTS.md`](../AGENTS.md)
- Web app: [`apps/web/AGENTS.md`](../apps/web/AGENTS.md)
