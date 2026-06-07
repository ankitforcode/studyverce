import {
  ensureLazyRedisReady,
  getLazyRedis,
} from "./client";
import {
  listingCacheKey,
  profileKey,
  roomMemberAuthKey,
  roomModAuthKey,
  roomMusicKey,
  roomOwnerAuthKey,
  roomOwnerIdKey,
} from "./keys";

export async function invalidateRoomMemberAuth(
  roomId: string,
  userId: string
): Promise<void> {
  const redis = await getLazyRedis();
  if (!redis) return;
  await ensureLazyRedisReady(redis);
  await redis.del(roomMemberAuthKey(roomId, userId));
}

export async function invalidateRoomAuth(roomId: string): Promise<void> {
  const redis = await getLazyRedis();
  if (!redis) return;
  await ensureLazyRedisReady(redis);
  await redis.del(roomOwnerIdKey(roomId));
}

export async function invalidateRoomMusic(roomId: string): Promise<void> {
  const redis = await getLazyRedis();
  if (!redis) return;
  await ensureLazyRedisReady(redis);
  await redis.del(roomMusicKey(roomId));
}

export async function invalidateListingCache(
  scope: "public" | "private" | "friends" | "favorites",
  userId?: string
): Promise<void> {
  const redis = await getLazyRedis();
  if (!redis) return;
  await ensureLazyRedisReady(redis);
  await redis.del(listingCacheKey(scope, userId));
}

export async function invalidateProfile(userId: string): Promise<void> {
  const redis = await getLazyRedis();
  if (!redis) return;
  await ensureLazyRedisReady(redis);
  await redis.del(profileKey(userId));
}

/** Clear cached owner/mod checks for a user in a room (e.g. after kick). */
export async function invalidateRoomUserAuth(
  roomId: string,
  userId: string
): Promise<void> {
  const redis = await getLazyRedis();
  if (!redis) return;
  await ensureLazyRedisReady(redis);
  await redis.del(
    roomMemberAuthKey(roomId, userId),
    roomOwnerAuthKey(roomId, userId),
    roomModAuthKey(roomId, userId)
  );
}
