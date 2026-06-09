import {
  ensureLazyRedisReady,
  getLazyRedis,
  isLazyRedisConfigured,
  publicProfileCacheKey,
  REDIS_TTL,
} from "@studyverce/redis";
import "@/lib/redis";

export type CachedPublicProfile = {
  profile: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    subject_tags: string[];
    study_streak: number;
    total_focus_minutes: number;
    plan_tier: string;
    premium_until: string | null;
    premium_source: string;
  };
  achievements: {
    slug: string;
    name: string;
    description: string;
    icon: string;
  }[];
};

export async function getCachedPublicProfile(
  username: string,
  load: () => Promise<CachedPublicProfile | null>
): Promise<CachedPublicProfile | null> {
  if (!isLazyRedisConfigured()) {
    return load();
  }

  const redis = await getLazyRedis();
  if (!redis) return load();

  await ensureLazyRedisReady(redis);

  const cacheKey = publicProfileCacheKey(username);
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached) as CachedPublicProfile;
  }

  const data = await load();
  if (data) {
    await redis.set(
      cacheKey,
      JSON.stringify(data),
      "EX",
      REDIS_TTL.publicProfileSeconds
    );
  }

  return data;
}

export async function invalidatePublicProfileCache(username: string): Promise<void> {
  if (!isLazyRedisConfigured()) return;

  const redis = await getLazyRedis();
  if (!redis) return;

  await ensureLazyRedisReady(redis);
  await redis.del(publicProfileCacheKey(username));
}
