import type Redis from "ioredis";
import type { ChatMessage } from "@studyverce/shared";
import {
  profileKey,
  REDIS_TTL,
  roomActiveCountKey,
  roomChatKey,
  roomMemberAuthKey,
  roomModAuthKey,
  roomOwnerAuthKey,
  roomOwnerIdKey,
  scanRedisKeys,
} from "@studyverce/redis";

const CHAT_HISTORY_LIMIT = 50;

export type CachedProfile = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export async function getCachedProfile(
  redis: Redis,
  userId: string,
  loadFromDb: () => Promise<CachedProfile>
): Promise<CachedProfile> {
  const cached = await redis.get(profileKey(userId));
  if (cached) return JSON.parse(cached) as CachedProfile;

  const profile = await loadFromDb();
  await redis.set(profileKey(userId), JSON.stringify(profile), "EX", REDIS_TTL.profileSeconds);
  return profile;
}

export async function getCachedRoomMember(
  redis: Redis,
  roomId: string,
  userId: string,
  loadFromDb: () => Promise<boolean>
): Promise<boolean> {
  const key = roomMemberAuthKey(roomId, userId);
  const cached = await redis.get(key);
  if (cached === "1") return true;
  if (cached === "0") return false;

  const isMember = await loadFromDb();
  await redis.set(key, isMember ? "1" : "0", "EX", REDIS_TTL.roomAuthSeconds);
  return isMember;
}

export async function invalidateRoomMemberAuth(
  redis: Redis,
  roomId: string,
  userId: string
): Promise<void> {
  await redis.del(roomMemberAuthKey(roomId, userId));
}

export async function getCachedRoomOwnerCheck(
  redis: Redis,
  roomId: string,
  userId: string,
  loadFromDb: () => Promise<boolean>
): Promise<boolean> {
  const key = roomOwnerAuthKey(roomId, userId);
  const cached = await redis.get(key);
  if (cached === "1") return true;
  if (cached === "0") return false;

  const isOwner = await loadFromDb();
  await redis.set(key, isOwner ? "1" : "0", "EX", REDIS_TTL.roomAuthSeconds);
  return isOwner;
}

export async function getCachedRoomOwnerOrMod(
  redis: Redis,
  roomId: string,
  userId: string,
  loadFromDb: () => Promise<boolean>
): Promise<boolean> {
  const key = roomModAuthKey(roomId, userId);
  const cached = await redis.get(key);
  if (cached === "1") return true;
  if (cached === "0") return false;

  const canManage = await loadFromDb();
  await redis.set(key, canManage ? "1" : "0", "EX", REDIS_TTL.roomAuthSeconds);
  return canManage;
}

export async function getCachedRoomOwnerId(
  redis: Redis,
  roomId: string,
  loadFromDb: () => Promise<string | null>
): Promise<string | null> {
  const key = roomOwnerIdKey(roomId);
  const cached = await redis.get(key);
  if (cached) return cached === "__none__" ? null : cached;

  const ownerId = await loadFromDb();
  await redis.set(
    key,
    ownerId ?? "__none__",
    "EX",
    REDIS_TTL.roomOwnerSeconds
  );
  return ownerId;
}

export async function getCachedActiveCount(
  redis: Redis,
  roomId: string,
  computeCount: () => Promise<number>
): Promise<number> {
  const key = roomActiveCountKey(roomId);
  const cached = await redis.get(key);
  if (cached !== null) return Number.parseInt(cached, 10);

  const count = await computeCount();
  await redis.set(key, String(count), "EX", REDIS_TTL.activeCountSeconds);
  return count;
}

export async function invalidateActiveCount(redis: Redis, roomId: string): Promise<void> {
  await redis.del(roomActiveCountKey(roomId));
}

export async function getCachedChatHistory(
  redis: Redis,
  roomId: string,
  loadFromDb: () => Promise<ChatMessage[]>
): Promise<ChatMessage[]> {
  const key = roomChatKey(roomId);
  const cached = await redis.lrange(key, 0, -1);
  if (cached.length > 0) {
    return cached.map((json) => JSON.parse(json) as ChatMessage);
  }

  const messages = await loadFromDb();
  if (messages.length === 0) return messages;

  const pipeline = redis.pipeline();
  pipeline.del(key);
  pipeline.rpush(key, ...messages.map((message) => JSON.stringify(message)));
  pipeline.expire(key, REDIS_TTL.chatSeconds);
  await pipeline.exec();
  return messages;
}

export async function appendChatMessage(
  redis: Redis,
  roomId: string,
  message: ChatMessage
): Promise<void> {
  const key = roomChatKey(roomId);
  const pipeline = redis.pipeline();
  pipeline.rpush(key, JSON.stringify(message));
  pipeline.ltrim(key, -CHAT_HISTORY_LIMIT, -1);
  pipeline.expire(key, REDIS_TTL.chatSeconds);
  await pipeline.exec();
}

export async function removeChatMessage(
  redis: Redis,
  roomId: string,
  messageId: string
): Promise<void> {
  const key = roomChatKey(roomId);
  const cached = await redis.lrange(key, 0, -1);
  if (cached.length === 0) return;

  const filtered = cached.filter((json) => {
    const message = JSON.parse(json) as ChatMessage;
    return message.id !== messageId;
  });

  const pipeline = redis.pipeline();
  pipeline.del(key);
  if (filtered.length > 0) {
    pipeline.rpush(key, ...filtered);
    pipeline.expire(key, REDIS_TTL.chatSeconds);
  }
  await pipeline.exec();
}

export async function listParticipantRoomKeys(redis: Redis): Promise<string[]> {
  return scanRedisKeys(redis, "room:*:participants");
}
