import { configureLazyRedis, resolveRedisUrl } from "@studyverce/redis";

function isRedisConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim() || process.env.REDIS_HOST?.trim());
}

/** Shared lazy Redis client for listing cache, invalidation, post-it overlay, and rate limits. */
configureLazyRedis({
  label: "web",
  isEnabled: isRedisConfigured,
  resolveUrl: () => resolveRedisUrl(),
});
