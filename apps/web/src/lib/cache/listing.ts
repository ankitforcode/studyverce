import {
  ensureLazyRedisReady,
  getLazyRedis,
  isLazyRedisConfigured,
  listingCacheKey,
  REDIS_TTL,
} from "@studyverce/redis";
import type { RoomListingItem } from "@/lib/rooms/listing";
import "@/lib/redis";

export async function getCachedListing(
  scope: "public" | "private" | "friends" | "favorites",
  userId: string | undefined,
  search: string | undefined,
  load: () => Promise<RoomListingItem[]>
): Promise<RoomListingItem[]> {
  if (!isLazyRedisConfigured()) {
    return load();
  }

  const redis = await getLazyRedis();
  if (!redis) return load();

  await ensureLazyRedisReady(redis);

  const cacheKey =
    scope === "public"
      ? listingCacheKey(`public:${search?.trim() || "all"}`)
      : listingCacheKey(scope, userId);

  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as RoomListingItem[];
  }

  const items = await load();
  await redis.set(cacheKey, JSON.stringify(items), "EX", REDIS_TTL.listingSeconds);
  return items;
}
