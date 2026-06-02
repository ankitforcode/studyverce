# Room reference

## Routes

| Route | File |
|-------|------|
| `/rooms` | `app/rooms/page.tsx` + `rooms-directory.tsx` |
| `/rooms/new` | `app/rooms/new/page.tsx` |
| `/rooms/[slug]` | `app/rooms/[slug]/page.tsx` → `room-client.tsx` |

## Key components

| Component | Role |
|-----------|------|
| `room-client.tsx` | Main layout orchestrator |
| `room-post-it-stack.tsx` | Post-it fetch + canvas overlay |
| `room-todo-panel.tsx` | Collapsible open/completed task list |
| `room-post-it-toolbar.tsx` | Add post-it + color picker |
| `room-task-prompt.tsx` | First-visit focus modal |
| `pomodoro-timer.tsx` | Center timer + goal text |
| `room-chat.tsx` | Sidebar chat |
| `room-music-player.tsx` / `room-music-picker.tsx` | Room music |
| `room-background-picker.tsx` | Wallpapers |
| `participant-list.tsx` | Who's in room |

## Layout classes

- Shell: `h-[calc(100dvh-4rem)] flex flex-col overflow-hidden`
- Main: `relative flex min-h-0 flex-1 overflow-visible`
- Aside: `lg:w-80 xl:w-96` with todo panel + chat

## Server data (room page)

- Room metadata, membership, wallpaper URL
- Initial chat messages, current track
- `getPostItForRoom` / `hasPostItForRoom` for prompt

## Related skills

- Post-it details: `studyverce-post-it-notes`
- Supabase/RLS: rule `supabase-migrations.mdc`
