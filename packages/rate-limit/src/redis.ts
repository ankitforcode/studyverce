import type Redis from "ioredis";

let client: Redis | null = null;
let clientPromise: Promise<Redis | null> | null = null;

export function isRateLimitEnabled(): boolean {
  if (process.env.RATE_LIMIT_ENABLED === "false") return false;
  return Boolean(process.env.REDIS_URL?.trim());
}

export async function getRateLimitRedis(): Promise<Redis | null> {
  if (!isRateLimitEnabled()) return null;

  if (client) return client;

  if (!clientPromise) {
    clientPromise = (async () => {
      const { default: RedisClient } = await import("ioredis");
      const redisUrl = process.env.REDIS_URL!.trim();
      const instance = new RedisClient(redisUrl, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
        enableOfflineQueue: false,
      });

      instance.on("error", (err) => {
        console.error("[rate-limit] Redis error:", err.message);
      });

      client = instance;
      return instance;
    })();
  }

  return clientPromise;
}

export async function closeRateLimitRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
    clientPromise = null;
  }
}
