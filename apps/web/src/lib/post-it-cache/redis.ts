import type Redis from "ioredis";

let client: Redis | null = null;
let clientPromise: Promise<Redis | null> | null = null;

export function isPostItCacheEnabled(): boolean {
  if (process.env.POST_IT_LAZY_PERSIST === "false") return false;
  if (process.env.REDIS_URL?.trim()) return true;
  return false;
}

export function postItFlushLockKey(userId: string, taskId: string) {
  return `postit:flush-lock:${userId}:${taskId}`;
}

export async function getPostItRedis(): Promise<Redis | null> {
  if (!isPostItCacheEnabled()) return null;

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
        console.error("[post-it-cache] Redis error:", err.message);
      });

      client = instance;
      return instance;
    })();
  }

  return clientPromise;
}
