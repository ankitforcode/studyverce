# Room reference

## Routes

| Route | File |
|-------|------|
| `/rooms` | `app/rooms/page.tsx` + `rooms-directory.tsx` |
| `/rooms/new` | `app/rooms/new/page.tsx` |
| `/rooms/[slug]` | `app/rooms/[slug]/page.tsx` → `room-client.tsx` |
| `/rooms/invite/[token]` | Invite join flow |
| `/auth/forgot-password`, `/auth/reset-password` | Password reset (shared `auth-page-shell.tsx`) |

## Key components

| Component | Role |
|-----------|------|
| `room-client.tsx` | Main layout orchestrator; `data-room-shell`, passes owner/socket to header |
| `participant-list.tsx` | Compact participant dropdown: search, friend/kick, portaled panel |
| `room-favorite-button.tsx` | Header + listing card favorite toggle |
| `room-share-link.tsx` | Share modal: copy link + email invite (`invite-actions.ts`) |
| `room-visibility-toggle.tsx` | Owner public/private toggle |
| `room-fullscreen-toggle.tsx` | Fullscreen room shell |
| `room-appearance-toggle.tsx` | Room light/dark appearance |
| `room-background-picker.tsx` | Wallpapers |
| `room-access-pending.tsx` | Waiting for owner approval |
| `room-access-removed.tsx` | Kicked user — request access again |
| `room-music-requests-banner.tsx` | Pending music requests (owner) |
| `room-friend-requests-banner.tsx` | Pending friend requests from in-room users (recipient) |
| `room-friend-requests-modal.tsx` | Accept/decline in-room friend requests |
| `room-post-it-stack.tsx` | Post-it fetch + canvas overlay |
| `room-todo-panel.tsx` | Collapsible open/completed task list |
| `room-post-it-toolbar.tsx` | Add post-it + color picker |
| `room-task-prompt.tsx` | First-visit focus modal |
| `pomodoro-timer.tsx` | Center timer + goal text |
| `room-chat.tsx` | Sidebar chat |
| `room-music-player.tsx` / `room-music-picker.tsx` | Room music |
| `rooms-directory.tsx` | Listing tabs, presence badges, favorites on cards |

## Server actions

| File | Actions |
|------|---------|
| `app/rooms/favorite-actions.ts` | `toggleRoomFavorite`, `getFavoriteRooms` |
| `app/rooms/member-actions.ts` | `kickRoomMember` |
| `app/rooms/access-actions.ts` | `setRoomVisibility`, `getRoomShareLink`, access requests |
| `app/rooms/invite-actions.ts` | `sendRoomEmailInvite` (`signInWithOtp`, magic-link email) |
| `app/friends/actions.ts` | `sendFriendRequest`, `acceptFriendRequest`, `getFriendshipStatuses`, `getPendingFriendRequestsInRoom` |
| `app/rooms/music-actions.ts` | Track requests, playback, `getMyMusicLibraryLimits`, paste-link add |
| `app/rooms/music-streaming-actions.ts` | Spotify/YouTube/Apple browse + import (Premium+) |
| `app/rooms/voice-note-actions.ts` | Premium voice notes — upload, share, transcribe |
| `lib/plan-limits.ts` | Participant cap, room video, voice notes plan checks |
| `lib/music/plan-limits.ts` | Music link count + streaming integration checks |
| `lib/rooms/listing.ts` | Room listing loaders per tab (Redis-cached when `REDIS_URL` set) |
| `lib/cache/listing.ts` | Listing tab cache (120s TTL) |
| `getCachedActiveCountsBatch` | `/presence` MGET batch (socket `redis-cache.ts`) |

## Hooks & infra

| File | Role |
|------|------|
| `hooks/use-socket.ts` | Room socket, `setPresenceMode`, `membership-revoked` redirect |
| `hooks/use-room-listing-presence.ts` | Live counts on `/rooms` cards |
| `lib/room-ui.ts` | Glass tokens, `ROOM_HEADER_ICON_BUTTON`, portal helpers |
| `lib/site-metadata.ts` | SEO metadata helpers |
| `apps/socket-server/src/index.ts` | `room:member:kick`, presence, inactive kick; `SOCKET_REDIS_ADAPTER` (off when single ECS task) |
| `apps/socket-server/src/redis-cache.ts` | Profile, chat, room-auth, active-count Redis caches |
| `packages/redis/` | Shared keys, lazy client, invalidation (`invalidateRoomMusic`, etc.) |
| `packages/shared/src/index.ts` | `RoomPresenceMode`, `viewPresenceMode`, socket events incl. `room:presence:set`, `room:member:kick` |

## Migrations (recent social/listing)

| Migration | Purpose |
|-----------|---------|
| `20250606000004_private_rooms_listing.sql` | Private tab RPC |
| `20250606000007_private_rooms_after_kick.sql` | Keep kicked users on private tab (`listingRole: removed`) |
| `20250606000002_user_friend_rooms_listing.sql` | Friends tab RPC |
| `20250606000005_user_favorite_rooms.sql` | `user_favorite_rooms` + favorites tab |
| `20250606000006_friendships_rls.sql` | RLS on `friendships` |

## Layout classes

- Shell: `h-[calc(100dvh-4rem)] flex flex-col overflow-hidden`
- Main: `relative flex min-h-0 flex-1 overflow-visible`
- Aside: `lg:w-80 xl:w-96` with todo panel + chat

## Server data (room page)

- Room metadata, membership, `owner_id`, wallpaper URL
- Initial chat messages, current track, initial favorited state
- `getPostItForRoom` / `hasPostItForRoom` for prompt

## Participant panel constants

- Width: `336px` (`PARTICIPANT_PANEL_WIDTH`)
- Portaled to `document.body`, `menuAlign`: `"end"` (header) \| `"start"` (mobile)

## Related skills

- Post-it details: `studyverce-post-it-notes`
- Supabase/RLS: rule `supabase-migrations.mdc`
