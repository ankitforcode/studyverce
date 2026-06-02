---
name: studyverce-rooms
description: StudyVerce study room page — layout, pomodoro overlay, chat, todo panel, music, wallpapers, socket realtime, and pointer-event layering. Use when editing room-client, room components, rooms routes, or room join flow.
---

# StudyVerce rooms

## Quick reference

See [reference.md](reference.md) for component tree and routes.

## Room page flow

1. `app/rooms/[slug]/page.tsx` — server fetch room, messages, track, wallpaper, post-it hints.
2. `room-client.tsx` — client shell: socket, state, layout.
3. Post-its overlay workspace; pomodoro centered; sidebar = todo + chat.

## Pointer-event layering

When adding overlays:

- Full-bleed wrappers: `pointer-events-none`
- Interactive widgets inside: `pointer-events-auto`
- Post-its: z-20 stack; pomodoro: z-10

Regressions here cause "can't click post-it" bugs.

## State lift pattern

`roomTasks` state in `room-client`:

```tsx
<RoomPostItStack tasks={roomTasks} onTasksChange={setRoomTasks} />
<RoomTodoPanel tasks={roomTasks} onTasksChange={setRoomTasks} />
```

Both must share the same array (includes closed tasks).

## Join task prompt

- `RoomTaskPrompt` when `!hasRoomTasks` and not skipped in sessionStorage.
- Key: `studyverce-skip-room-task-${roomId}`.

## Realtime (`use-socket.ts`)

Chat send/delete, pomodoro control, music/wallpaper broadcast. Track analytics via `trackEvent` where existing.

## Navbar

Visible on room pages. Dashboard uses custom top bar instead (`conditional-navbar` hides global navbar on `/dashboard`).
