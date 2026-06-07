import {
  closeLazyRedis,
  ensureLazyRedisReady,
  getLazyRedis,
  isLazyRedisConfigured,
} from "@studyverce/redis";

export function isRateLimitEnabled(): boolean {
  if (process.env.RATE_LIMIT_ENABLED === "false") return false;
  return isLazyRedisConfigured();
}

export async function getRateLimitRedis() {
  return getLazyRedis();
}

export { ensureLazyRedisReady };

export async function closeRateLimitRedis(): Promise<void> {
  await closeLazyRedis();
}
