# Post-it reference

## Schema (`user_post_it_tasks`)

```sql
id, user_id, room_id, title, title_done, items JSONB,
pos_x, pos_y, width, height, color, z_index, pinned, closed,
created_at, updated_at
```

## Server actions (`task-actions.ts`)

| Action | Purpose |
|--------|---------|
| `getPostItsForRoom` | All tasks for user in room |
| `createPostItTask` | New note with default position/size |
| `updatePostItTask` | Patch any field |
| `deletePostItTask` | Remove |
| `closePostItTask` | Mark done + closed |
| `reopenPostItTask` | Restore open + clear done + bump z |
| `togglePostItPin` | Pin/unpin (blocks drag) |
| `bringPostItToFront` | Max z in room (prefer optimistic client bump) |

## Components

```
room-client.tsx
  └── RoomPostItStack (fetch, openTasks → canvas)
        ├── PostItCanvas → PostItNote
        └── RoomPostItToolbar
  └── RoomTodoPanel (open + closed lists)
  └── RoomTaskPrompt (first-visit modal)
```

## Shared types

```typescript
interface PostItItem { id: string; text: string; done: boolean }
interface UserPostItTask {
  id, userId, roomId, title, titleDone, items,
  posX, posY, width, height, color, zIndex, pinned, closed,
  createdAt, updatedAt
}
```

## Migrations

- `20250602000006_user_post_it_tasks.sql` — base table + RLS
- `20250602000007_user_post_it_tasks_pinned.sql`
- `20250602000008_user_post_it_tasks_size.sql`
- `20250602000009_user_post_it_tasks_closed.sql`

## Hooks / utils

- `use-post-it-fit-font.ts` — shrink font until content fits
- `post-it-utils.ts` — colors, shadows, size bounds, `POST_IT_SIZE`
