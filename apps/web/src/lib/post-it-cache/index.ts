import { after } from "next/server";
import type { PostItColor, PostItItem, UserPostItTask } from "@studyverce/shared";
import { getPostItRedis, isPostItCacheEnabled } from "@/lib/post-it-cache/redis";

const TASK_TTL_SEC = 60 * 60 * 24;
const DEFAULT_FLUSH_DEBOUNCE_MS = 800;

export type PostItTaskPatch = {
  title?: string;
  titleDone?: boolean;
  items?: PostItItem[];
  posX?: number;
  posY?: number;
  width?: number;
  height?: number;
  color?: PostItColor;
  zIndex?: number;
  pinned?: boolean;
  closed?: boolean;
};

function taskKey(userId: string, taskId: string) {
  return `postit:task:${userId}:${taskId}`;
}

function genKey(userId: string, taskId: string) {
  return `postit:gen:${userId}:${taskId}`;
}

function flushLockKey(userId: string, taskId: string) {
  return `postit:flush-lock:${userId}:${taskId}`;
}

function flushDebounceMs() {
  const raw = process.env.POST_IT_FLUSH_DEBOUNCE_MS;
  const n = raw ? Number.parseInt(raw, 10) : DEFAULT_FLUSH_DEBOUNCE_MS;
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_FLUSH_DEBOUNCE_MS;
}

export function applyPostItPatch(
  task: UserPostItTask,
  patch: PostItTaskPatch
): UserPostItTask {
  return {
    ...task,
    title: patch.title !== undefined ? patch.title : task.title,
    titleDone: patch.titleDone !== undefined ? patch.titleDone : task.titleDone,
    items: patch.items !== undefined ? patch.items : task.items,
    posX: patch.posX !== undefined ? patch.posX : task.posX,
    posY: patch.posY !== undefined ? patch.posY : task.posY,
    width: patch.width !== undefined ? patch.width : task.width,
    height: patch.height !== undefined ? patch.height : task.height,
    color: patch.color !== undefined ? patch.color : task.color,
    zIndex: patch.zIndex !== undefined ? patch.zIndex : task.zIndex,
    pinned: patch.pinned !== undefined ? patch.pinned : task.pinned,
    closed: patch.closed !== undefined ? patch.closed : task.closed,
    updatedAt: new Date().toISOString(),
  };
}

export async function getCachedPostItTask(
  userId: string,
  taskId: string
): Promise<UserPostItTask | null> {
  const redis = await getPostItRedis();
  if (!redis) return null;

  if (redis.status !== "ready") {
    await redis.connect();
  }

  const raw = await redis.get(taskKey(userId, taskId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as UserPostItTask;
  } catch {
    await redis.del(taskKey(userId, taskId));
    return null;
  }
}

export async function setCachedPostItTask(
  userId: string,
  task: UserPostItTask
): Promise<void> {
  const redis = await getPostItRedis();
  if (!redis) return;

  if (redis.status !== "ready") {
    await redis.connect();
  }

  await redis.set(
    taskKey(userId, task.id),
    JSON.stringify(task),
    "EX",
    TASK_TTL_SEC
  );
}

export async function invalidatePostItCache(
  userId: string,
  taskId: string
): Promise<void> {
  const redis = await getPostItRedis();
  if (!redis) return;

  if (redis.status !== "ready") {
    await redis.connect();
  }

  await redis.del(taskKey(userId, taskId), genKey(userId, taskId));
}

export async function mergeDbTasksWithCache(
  userId: string,
  dbTasks: UserPostItTask[]
): Promise<UserPostItTask[]> {
  if (!isPostItCacheEnabled() || dbTasks.length === 0) return dbTasks;

  const redis = await getPostItRedis();
  if (!redis) return dbTasks;

  if (redis.status !== "ready") {
    await redis.connect();
  }

  const keys = dbTasks.map((t) => taskKey(userId, t.id));
  const cached = await redis.mget(...keys);

  return dbTasks.map((task, i) => {
    const raw = cached[i];
    if (!raw) return task;
    try {
      return JSON.parse(raw) as UserPostItTask;
    } catch {
      return task;
    }
  });
}

export async function cachePostItUpdate(
  userId: string,
  base: UserPostItTask,
  patch: PostItTaskPatch,
  options?: { scheduleFlush?: boolean }
): Promise<UserPostItTask> {
  const merged = applyPostItPatch(base, patch);
  await setCachedPostItTask(userId, merged);

  if (options?.scheduleFlush !== false) {
    const redis = await getPostItRedis();
    if (redis) {
      if (redis.status !== "ready") {
        await redis.connect();
      }
      const generation = await redis.incr(genKey(userId, merged.id));
      scheduleLazyPostItFlush(userId, merged.id, generation);
    }
  }

  return merged;
}

export function scheduleLazyPostItFlush(
  userId: string,
  taskId: string,
  generation: number
): void {
  const debounceMs = flushDebounceMs();

  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, debounceMs));

    const redis = await getPostItRedis();
    if (!redis) return;

    try {
      if (redis.status !== "ready") {
        await redis.connect();
      }

      const currentGen = await redis.get(genKey(userId, taskId));
      if (Number(currentGen) !== generation) return;

      const { flushPostItTaskToDatabase } = await import(
        "@/lib/post-it-cache/flush"
      );
      await flushPostItTaskToDatabase(userId, taskId);
    } catch (err) {
      console.error("[post-it-cache] lazy flush failed:", err);
    }
  });
}

export async function flushPostItTaskNow(
  userId: string,
  taskId: string
): Promise<void> {
  const { flushPostItTaskToDatabase } = await import("@/lib/post-it-cache/flush");
  await flushPostItTaskToDatabase(userId, taskId);
}

export { isPostItCacheEnabled };
