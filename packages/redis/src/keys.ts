export const REDIS_TTL = {
  profileSeconds: 600,
  roomAuthSeconds: 120,
  roomOwnerSeconds: 300,
  activeCountSeconds: 3,
  chatSeconds: 3600,
  listingSeconds: 45,
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

export function roomActiveCountKey(roomId: string) {
  return `room:${roomId}:active_count`;
}

export function roomChatKey(roomId: string) {
  return `room:${roomId}:chat`;
}

export function listingCacheKey(scope: string, userId?: string) {
  return userId ? `listing:${scope}:${userId}` : `listing:${scope}`;
}
