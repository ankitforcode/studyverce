import { ensureLazyRedisReady, getLazyRedis } from "@studyverce/redis";
import "@/lib/redis";

export function isPostItCacheEnabled(): boolean {
  if (process.env.POST_IT_LAZY_PERSIST === "false") return false;
  return Boolean(process.env.REDIS_URL?.trim());
}

export function postItFlushLockKey(userId: string, taskId: string) {
  return `postit:flush-lock:${userId}:${taskId}`;
}

export async function getPostItRedis() {
  return getLazyRedis();
}

export { ensureLazyRedisReady };
