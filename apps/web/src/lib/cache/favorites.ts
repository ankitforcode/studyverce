import {
  ensureLazyRedisReady,
  getLazyRedis,
  isLazyRedisConfigured,
  favoritesCacheKey,
  REDIS_TTL,
} from "@studyverce/redis";
import "@/lib/redis";

export async function getCachedFavoriteRoomIds(
  userId: string,
  load: () => Promise<string[]>
): Promise<string[]> {
  if (!isLazyRedisConfigured()) {
    return load();
  }

  const redis = await getLazyRedis();
  if (!redis) return load();

  await ensureLazyRedisReady(redis);

  const cacheKey = favoritesCacheKey(userId);
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as string[];
  }

  const ids = await load();
  await redis.set(cacheKey, JSON.stringify(ids), "EX", REDIS_TTL.favoritesSeconds);
  return ids;
}

export async function invalidateFavoriteRoomIdsCache(userId: string): Promise<void> {
  if (!isLazyRedisConfigured()) return;

  const redis = await getLazyRedis();
  if (!redis) return;

  await ensureLazyRedisReady(redis);
  await redis.del(favoritesCacheKey(userId));
}
