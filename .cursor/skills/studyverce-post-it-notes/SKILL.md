---
name: studyverce-post-it-notes
description: Implements and fixes StudyVerce room post-it notes — data model, drag/resize, z-index, close/reopen, todo panel sync, tooltips, and migrations. Use when changing post-it UI, task-actions, user_post_it_tasks schema, room post-it stack, or todo sidebar.
---

# StudyVerce post-it notes

## Quick reference

Read [reference.md](reference.md) for full file map, API list, and migration history.

## Workflow: new post-it capability

1. Confirm scope is **room-only** and **per-user** (RLS).
2. Add migration → update `database.types.ts`, `post-it-mapper.ts`, `packages/shared`.
3. Extend `task-actions.ts` (server) and optionally `post-it-client.ts` (client).
4. Update `post-it-note.tsx` UI; wire through `post-it-canvas.tsx` → `room-post-it-stack.tsx`.
5. If task list UI changes, update `room-todo-panel.tsx` and `room-client.tsx` state lift.
6. Run `pnpm --filter web exec tsc --noEmit`.

## Workflow: fix interaction bug

Check in order:

1. **Pointer events** — parent `pointer-events-none` blocking clicks?
2. **Z-index** — never clamp with `Math.max(z, 10)`; optimistic focus before server persist.
3. **Drag/resize** — use document `pointermove`/`pointerup`; hide ring/toolbar while `dragging`.
4. **State merge** — canvas shows open tasks only; closed tasks stay in parent array for todo panel.
5. **Stale server** — client fetch + auth retry in `post-it-client.ts`.

## UI patterns to follow

- `PostItIconTooltip` for all icon-only controls (no native `title`).
- Single surface: `backgroundColor` + `boxShadow` on outer note ref.
- `POST_IT_*` constants from `lib/post-it-utils.ts` (sizes 140–360, font 8–15px).
- Edit mode: double-click; click-outside saves; Escape cancels.

## Do not

- Put post-its on the dashboard canvas (removed by design).
- Share post-its between users or rooms.
- Skip migration when adding DB columns.
