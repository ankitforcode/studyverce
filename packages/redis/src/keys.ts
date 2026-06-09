/** Upstash (or similar) free-tier targets — tune via env where noted in README. */
export const REDIS_BUDGET = {
  maxStorageMb: 256,
  maxCommandsPerMonth: 500_000,
} as const;

export const REDIS_TTL = {
  profileSeconds: 600,
  roomAuthSeconds: 120,
  roomOwnerSeconds: 300,
  /** Bumped from 3s to cut /presence GET load (~4× fewer commands). */
  activeCountSeconds: 15,
  chatSeconds: 3600,
  /** Bumped from 45s — listing is invalidated on room mutations. */
  listingSeconds: 120,
  /** Per-user favorite room IDs on listing page. */
  favoritesSeconds: 120,
  /** Public profile pages by username. */
  publicProfileSeconds: 300,
  /** Refreshed on each participant write; empty hashes are deleted. */
  participantsSeconds: 2 * 60 * 60,
  roomMusicSeconds: 3600,
  postItTaskSeconds: 4 * 60 * 60,
  postItGenSeconds: 300,
  /** Resets at UTC midnight; keep through next day. */
  studyAssistantQuotaSeconds: 48 * 60 * 60,
} as const;

export function profileKey(userId: string) {
  return `profile:${userId}`;
}

export function roomMemberAuthKey(roomId: string, userId: string) {
  return `room:auth:member:${roomId}:${userId}`;
}

export function roomOwnerAuthKey(roomId: string, userId: string) {
  return `room:auth:owner:${roomId}:${userId}`;
}

export function roomModAuthKey(roomId: string, userId: string) {
  return `room:auth:mod:${roomId}:${userId}`;
}

export function roomOwnerIdKey(roomId: string) {
  return `room:auth:owner_id:${roomId}`;
}

export function roomMusicKey(roomId: string) {
  return `room:${roomId}:music`;
}

export function roomParticipantsKey(roomId: string) {
  return `room:${roomId}:participants`;
}

/** SET of room IDs with a non-empty participants hash (avoids SCAN on sweeps). */
export function roomParticipantsRoomsKey() {
  return "room:participant_rooms";
}

export function roomActiveCountKey(roomId: string) {
  return `room:${roomId}:active_count`;
}

export function roomChatKey(roomId: string) {
  return `room:${roomId}:chat`;
}

export function listingCacheKey(scope: string, userId?: string) {
  return userId ? `listing:${scope}:${userId}` : `listing:${scope}`;
}

export function favoritesCacheKey(userId: string) {
  return `favorites:${userId}`;
}

export function publicProfileCacheKey(username: string) {
  return `profile:public:${username.toLowerCase()}`;
}

export function studyAssistantDailyQuotaKey(
  userId: string,
  roomId: string,
  dayKey: string
) {
  return `study-assistant:quota:${userId}:${roomId}:${dayKey}`;
}
