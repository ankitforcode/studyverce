# StudyVerce Cursor skills

Deep workflows for agents. **Read the matching skill before editing; update it when you add or change features** (see rule `skills-maintenance.mdc`).

## Skill index

| Skill | Path | Use when |
|-------|------|----------|
| Rooms | `studyverce-rooms/SKILL.md` | Room page, header, participant menu, music/wallpaper, listing, favorites, friends/kick, socket realtime |
| Friends | `app/friends/page.tsx` + `friends/actions.ts` | Friends list (`/friends`), accept/decline requests; linked from profile side menu |
| Post-it notes | `studyverce-post-it-notes/SKILL.md` | Room post-its, `task-actions`, schema, todo panel sync |
| Dashboard | `studyverce-dashboard/SKILL.md` | Dashboard shell, stats, calendar, charts (no post-it canvas) |

Each skill may include `reference.md` for file/action/migration tables.

## Maintenance workflow

1. Identify the feature area → pick skill from the table above.
2. Implement the code change.
3. Update that skill’s `SKILL.md` (workflows, pitfalls) and `reference.md` (tables).
4. If new primary files or a new feature name: add a row to root `AGENTS.md` “Where to look”.
5. If patterns affect a globbed rule: update `.cursor/rules/*.mdc` (e.g. `room-features.mdc`).
6. New domain with no skill yet: add `.cursor/skills/<name>/SKILL.md` and a row in this README.

## Related agent memory

- **Always-on**: `.cursor/rules/studyverce-overview.mdc`, `.cursor/rules/skills-maintenance.mdc`
- **File-scoped**: `.cursor/rules/post-it-notes.mdc`, `room-features.mdc`, `supabase-migrations.mdc`, `nextjs-web.mdc`
- **Root guide**: `AGENTS.md`
