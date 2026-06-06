---
name: studyverce-rooms
description: StudyVerce study room page — layout, pomodoro overlay, chat, todo panel, music, wallpapers, participant menu, favorites, socket realtime, listing presence, and pointer-event layering. Use when editing room-client, room components, rooms routes, or room join flow.
---

# StudyVerce rooms

## Quick reference

See [reference.md](reference.md) for component tree, routes, server actions, and socket events.

## Room page flow

1. `app/rooms/[slug]/page.tsx` — server fetch room, messages, track, wallpaper, post-it hints, favorite state.
2. Pass `roomOwnerId={room.owner_id}` into `RoomClient` (needed for kick + participant menu).
3. `room-client.tsx` — client shell: socket, state, layout; root has `data-room-shell` for light-mode CSS vars.
4. Post-its overlay workspace; pomodoro centered; sidebar = todo + chat.

## Pointer-event layering

When adding overlays:

- Full-bleed wrappers: `pointer-events-none`
- Interactive widgets inside: `pointer-events-auto`
- Post-its: z-20 stack; pomodoro: z-10

Regressions here cause "can't click post-it" bugs.

## Room UI tokens (`lib/room-ui.ts`)

Reuse these instead of one-off glass styles:

| Token | Use |
|-------|-----|
| `ROOM_CHROME_PANEL` | Header / sidebar chrome |
| `ROOM_HEADER_CONTROL` | Glass panel base for controls |
| `ROOM_HEADER_ICON_BUTTON` | Square header icons — **use for hover** (`hover:bg-secondary`) |
| `ROOM_GLASS_PANEL` | Pomodoro / floating widgets |
| `ROOM_TOOLBAR_PANEL` | Post-it bottom bar |
| `ROOM_INNER_SURFACE` | Nested cards in sidebar |
| `ROOM_FIELD` | Inputs on glass (participant search, chat, etc.) |

Light mode: scoped vars in `globals.css` under `html.light [data-room-shell]`; components also use `light:` Tailwind variants from `room-ui.ts`.

## Room header controls

Wired in `room-client.tsx` header row:

| Control | Component | Notes |
|---------|-----------|-------|
| Participants | `participant-list.tsx` (`variant="compact"`) | See participant menu below |
| Appearance | `room-appearance-toggle.tsx` | Light/dark for room shell |
| Wallpaper | `room-background-picker.tsx` | Owner/mod only |
| Fullscreen | `room-fullscreen-toggle.tsx` | |
| Visibility | `room-visibility-toggle.tsx` | Owner only; emits `room:visibility:set` |
| Favorite | `room-favorite-button.tsx` | `toggleRoomFavorite`; also on listing cards |
| Share | `room-share-link.tsx` | `Share2` icon; copies invite/public URL |
| Access / music requests | `room-access-banner.tsx`, `room-music-requests-banner.tsx` | `variant="outline"` + primary tint |

**Hover:** header square icons must use `ROOM_HEADER_ICON_BUTTON` (not subtle `hover:bg-card/35`).

Pass into `ParticipantList`: `roomId`, `roomOwnerId`, `isRoomOwner={isOwner}`, `socket`.

## Participant menu (`participant-list.tsx`)

Compact dropdown in header (and mobile strip). **Portal panel to `document.body`** with fixed position — avoids sidebar/header clipping (`z-[120]`).

### Panel UX

- Click trigger to open; outside click / Escape closes.
- Header: "In this room" + active/away counts (summary only — no per-row Active/Away pills).
- **Search** above list: filters **other** users by display name or `@handle` (`ROOM_FIELD` + search icon).
- **Current user** pinned at top in a bordered card (`border-primary/35`); always visible regardless of search.
- **Others** listed below a divider, sorted active first then name.
- Escape clears search first, then closes panel; search resets on close.
- Row enter animations: `participant-panel-enter` / `participant-row-enter` in `globals.css`.

### Self presence controls

Current-user card has **Active / Away / Invisible** toggles:

| Mode | You see | Others see |
|------|---------|------------|
| `active` | Green dot | Green dot (active) |
| `away` | Yellow dot | Yellow dot (away) |
| `invisible` | Grey dot | **Hidden** — omitted from list, avatars, and counts |

- Client: `setPresenceMode` from `useRoomSocket` → `room:presence:set`.
- UI: `filterParticipantsForViewer(participants, currentUserId)` before rendering.
- Server: stores `presenceMode` on `RoomParticipant`; `room:ping` only restores active when mode is `active`.
- Helpers: `filterParticipantsForViewer`, `isParticipantVisibleToViewer`, `normalizePresenceMode` in `@studyverce/shared`.

### Presence on avatar

- **Active:** green dot (`bg-primary`)
- **Away:** yellow dot (`bg-yellow-400`)
- **Invisible (self only):** grey dot (`bg-muted-foreground/60`)
- Do not re-add per-row Active/Away text badges.

### Row actions

| Action | Who | Server | Socket |
|--------|-----|--------|--------|
| Friend request (`UserPlus`) | Everyone except self | `friends/actions.ts` → `sendFriendRequest` | — |
| Kick (`UserX`) | Room owner only; not self or owner | `member-actions.ts` → `kickRoomMember` | `room:member:kick` |

On panel open, batch-load friendship status via `getFriendshipStatuses` for other users.

**Tooltips:** `PostItIconTooltip` with `side="bottom"` by default; **last filtered row uses `side="top"`** so tooltips are not clipped by `overflow-y-auto` on the list. Row action buttons use **`align="end"`** so labels are not clipped on the panel’s right edge.

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

## Realtime (`use-socket.ts` / socket-server)

Chat send/delete, pomodoro control, music/wallpaper broadcast, visibility, kicks.

| Event | Direction | Purpose |
|-------|-----------|---------|
| `room:member:kick` | client → server | Owner kicked a member |
| `room:membership-revoked` | server → client | `reason: "kicked"` \| `"inactive"`; redirect `/rooms?removed=kicked` |
| `rooms:presence:subscribe` | listing | Live room counts |
| `rooms:presence-count` | listing | Count updates |

Kicked users see banner on `rooms-directory.tsx` (`?removed=kicked`).

## Room listing (`/rooms`)

- `rooms-directory.tsx` — tabs: trending, private, friends, favorites.
- Live presence badge on cards: `use-room-listing-presence.ts` + `/presence` rewrite in `next.config.ts`.
- Favorites: `favorite-actions.ts`, migration `20250606000005_user_favorite_rooms.sql`.
- **Do not** call `revalidatePath` from favorite toggle (caused client fetch errors).
- Card description: room text only (no owner name).

## Friends (room context)

- `friendships` table RLS: migration `20250606000006_friendships_rls.sql`.
- `app/friends/actions.ts` — `sendFriendRequest`, `getFriendshipStatuses`.
- Friends tab listing RPC: `get_user_friend_rooms()` (may return empty until accept flow exists).

## Navbar

Visible on room pages. Dashboard uses custom top bar instead (`conditional-navbar` hides global navbar on `/dashboard`).

## Checklist (participant / social changes)

1. `ParticipantList` compact instances get `roomId`, `roomOwnerId`, `isRoomOwner`, `socket`.
2. Kick: delete `room_members` row, then emit `room:member:kick`.
3. New friendship DB policy → migration + `database.types.ts`.
4. Portaled panels/tooltips: watch `overflow-y-auto` clipping.
5. Typecheck: `pnpm --filter web exec tsc --noEmit` and socket-server if events change.

## Skills maintenance

After any room/listing/social change, update this skill + [reference.md](reference.md), `room-features.mdc`, and root `AGENTS.md` if files or flows are new. See `.cursor/rules/skills-maintenance.mdc`.
