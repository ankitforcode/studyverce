import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PostItItem, PostItColor } from "@studyverce/shared";
import { mapPostItRow, type PostItTaskRow } from "@/lib/post-it-mapper";
import {
  getCachedPostItTask,
  invalidatePostItCache,
  setCachedPostItTask,
} from "@/lib/post-it-cache/index";
import { getPostItRedis, postItFlushLockKey } from "@/lib/post-it-cache/redis";

export async function flushPostItTaskToDatabase(
  userId: string,
  taskId: string
): Promise<{ error: string | null }> {
  const cached = await getCachedPostItTask(userId, taskId);
  if (!cached) return { error: null };

  const redis = await getPostItRedis();
  if (!redis) {
    return flushPostItDirect(userId, taskId, cached);
  }

  if (redis.status !== "ready") {
    await redis.connect();
  }

  const acquired = await redis.set(
    postItFlushLockKey(userId, taskId),
    "1",
    "EX",
    30,
    "NX"
  );
  if (!acquired) return { error: null };

  try {
    return await flushPostItDirect(userId, taskId, cached);
  } finally {
    await redis.del(postItFlushLockKey(userId, taskId));
  }
}

async function flushPostItDirect(
  userId: string,
  taskId: string,
  cached: {
    title: string;
    titleDone: boolean;
    items: PostItItem[];
    posX: number;
    posY: number;
    width: number;
    height: number;
    color: PostItColor;
    zIndex: number;
    pinned: boolean;
    closed: boolean;
  }
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== userId) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase
    .from("user_post_it_tasks")
    .update({
      title: cached.title,
      title_done: cached.titleDone,
      items: cached.items,
      pos_x: cached.posX,
      pos_y: cached.posY,
      width: cached.width,
      height: cached.height,
      color: cached.color,
      z_index: cached.zIndex,
      pinned: cached.pinned,
      closed: cached.closed,
    })
    .eq("id", taskId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) {
    console.error("[post-it-cache] flush:", error?.message ?? "no row");
    return { error: error?.message ?? "Failed to flush task" };
  }

  const flushed = mapPostItRow(data as PostItTaskRow);
  await setCachedPostItTask(userId, flushed);
  revalidatePath("/dashboard");
  return { error: null };
}

export async function flushAndInvalidatePostIt(
  userId: string,
  taskId: string
): Promise<{ error: string | null }> {
  const result = await flushPostItTaskToDatabase(userId, taskId);
  await invalidatePostItCache(userId, taskId);
  return result;
}
