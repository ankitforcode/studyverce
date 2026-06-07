import type Redis from "ioredis";

export type LazyRedisOptions = {
  label: string;
  isEnabled: () => boolean;
  resolveUrl?: () => string;
};

let lazyClient: Redis | null = null;
let lazyClientPromise: Promise<Redis | null> | null = null;
let lazyOptions: LazyRedisOptions | null = null;

export function configureLazyRedis(options: LazyRedisOptions): void {
  if (lazyOptions) return;
  lazyOptions = options;
}

export function isLazyRedisConfigured(): boolean {
  return lazyOptions?.isEnabled() ?? false;
}

export async function getLazyRedis(): Promise<Redis | null> {
  if (!lazyOptions?.isEnabled()) return null;

  if (lazyClient) return lazyClient;

  if (!lazyClientPromise) {
    lazyClientPromise = (async () => {
      const { default: RedisClient } = await import("ioredis");
      const { resolveRedisUrl } = await import("./url");
      const redisUrl = lazyOptions!.resolveUrl?.() ?? resolveRedisUrl();
      const instance = new RedisClient(redisUrl, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
        enableOfflineQueue: false,
      });

      instance.on("error", (err) => {
        console.error(`[${lazyOptions!.label}] Redis error:`, err.message);
      });

      lazyClient = instance;
      return instance;
    })();
  }

  return lazyClientPromise;
}

export async function ensureLazyRedisReady(redis: Redis): Promise<void> {
  if (redis.status !== "ready") {
    await redis.connect();
  }
}

export async function closeLazyRedis(): Promise<void> {
  if (lazyClient) {
    await lazyClient.quit();
    lazyClient = null;
    lazyClientPromise = null;
  }
}
