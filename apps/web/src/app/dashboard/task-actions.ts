"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  type PostItColor,
  type PostItItem,
  type UserPostItTask,
  POST_IT_COLORS,
} from "@studyverce/shared";

import type { PostItTaskRow } from "@/lib/post-it-mapper";
import { mapPostItRow } from "@/lib/post-it-mapper";
import {
  POST_IT_DEFAULT_SIZE,
  POST_IT_MAX_SIZE,
  POST_IT_MIN_SIZE,
} from "@/lib/post-it-utils";
import {
  sanitizePostItHtml,
  sanitizePostItItems,
  sanitizePostItTitle,
  stripPostItHtml,
} from "@/lib/post-it-rich-text";
import {
  cachePostItUpdate,
  flushPostItTaskNow,
  getCachedPostItTask,
  invalidatePostItCache,
  isPostItCacheEnabled,
  mergeDbTasksWithCache,
  type PostItTaskPatch,
} from "@/lib/post-it-cache";

function clampPostItSize(value: number | undefined) {
  const n = value ?? POST_IT_DEFAULT_SIZE;
  return Math.min(POST_IT_MAX_SIZE, Math.max(POST_IT_MIN_SIZE, n));
}

function revalidateDashboard() {
  revalidatePath("/dashboard");
}

export async function getUserPostItTasks(): Promise<UserPostItTask[]> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("user_post_it_tasks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("getUserPostItTasks:", error.message);
    return [];
  }
  if (!data) return [];
  const tasks = data.map((row) => mapPostItRow(row as PostItTaskRow));
  return mergeDbTasksWithCache(user.id, tasks);
}

export async function getPostItsForRoom(
  roomId: string
): Promise<UserPostItTask[]> {
  noStore();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("user_post_it_tasks")
    .select("*")
    .eq("user_id", user.id)
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  const tasks = data.map((row) => mapPostItRow(row as PostItTaskRow));
  return mergeDbTasksWithCache(user.id, tasks);
}

export async function getPostItForRoom(
  roomId: string
): Promise<UserPostItTask | null> {
  const tasks = await getPostItsForRoom(roomId);
  return tasks[0] ?? null;
}

export async function hasPostItForRoom(roomId: string): Promise<boolean> {
  const tasks = await getPostItsForRoom(roomId);
  return tasks.length > 0;
}

export async function createPostItTask(input: {
  title: string;
  roomId?: string | null;
  items?: PostItItem[];
  posX?: number;
  posY?: number;
  width?: number;
  height?: number;
  color?: PostItColor;
}): Promise<{ error: string | null; task?: UserPostItTask }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const titleRaw = sanitizePostItTitle(input.title);
  const title = stripPostItHtml(titleRaw).trim()
    ? titleRaw
    : "New note";
  if (stripPostItHtml(title).length > 120) return { error: "Title is too long" };

  const existing = await getUserPostItTasks();
  const offset = existing.length;

  const { data, error } = await supabase
    .from("user_post_it_tasks")
    .insert({
      user_id: user.id,
      room_id: input.roomId ?? null,
      title,
      items: input.items ? sanitizePostItItems(input.items) : [],
      pos_x: input.posX ?? 24 + (offset % 4) * 28,
      pos_y: input.posY ?? 24 + Math.floor(offset / 4) * 32,
      width: clampPostItSize(input.width),
      height: clampPostItSize(input.height),
      color: input.color ?? POST_IT_COLORS[offset % POST_IT_COLORS.length],
      z_index: offset + 1,
    })
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to create task" };

  revalidateDashboard();
  return { task: mapPostItRow(data as PostItTaskRow), error: null };
}

type UpdatePostItOptions = {
  /** When cache is on: `lazy` writes Redis and flushes DB after debounce (default). */
  flush?: "lazy" | "immediate";
};

function buildSanitizedPostItPatch(patch: {
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
}): { error: string | null; patch?: PostItTaskPatch } {
  const sanitized: PostItTaskPatch = {};

  if (patch.title !== undefined) {
    sanitized.title = sanitizePostItTitle(patch.title);
    if (stripPostItHtml(sanitized.title).length > 120) {
      return { error: "Title is too long" };
    }
  }
  if (patch.titleDone !== undefined) sanitized.titleDone = patch.titleDone;
  if (patch.items !== undefined) sanitized.items = sanitizePostItItems(patch.items);
  if (patch.posX !== undefined) sanitized.posX = patch.posX;
  if (patch.posY !== undefined) sanitized.posY = patch.posY;
  if (patch.width !== undefined) sanitized.width = clampPostItSize(patch.width);
  if (patch.height !== undefined) sanitized.height = clampPostItSize(patch.height);
  if (patch.color !== undefined) sanitized.color = patch.color;
  if (patch.zIndex !== undefined) sanitized.zIndex = patch.zIndex;
  if (patch.pinned !== undefined) sanitized.pinned = patch.pinned;
  if (patch.closed !== undefined) sanitized.closed = patch.closed;

  if (Object.keys(sanitized).length === 0) {
    return { error: "No changes" };
  }

  return { error: null, patch: sanitized };
}

async function loadOwnedPostItTask(
  userId: string,
  taskId: string
): Promise<UserPostItTask | null> {
  const cached = await getCachedPostItTask(userId, taskId);
  if (cached) return cached;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_post_it_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return mapPostItRow(data as PostItTaskRow);
}

async function updatePostItTaskInDatabase(
  userId: string,
  taskId: string,
  patch: PostItTaskPatch
): Promise<{ error: string | null; task?: UserPostItTask }> {
  const supabase = await createClient();
  const update: {
    title?: string;
    title_done?: boolean;
    items?: PostItItem[];
    pos_x?: number;
    pos_y?: number;
    width?: number;
    height?: number;
    color?: PostItColor;
    z_index?: number;
    pinned?: boolean;
    closed?: boolean;
  } = {};

  if (patch.title !== undefined) update.title = patch.title;
  if (patch.titleDone !== undefined) update.title_done = patch.titleDone;
  if (patch.items !== undefined) update.items = patch.items;
  if (patch.posX !== undefined) update.pos_x = patch.posX;
  if (patch.posY !== undefined) update.pos_y = patch.posY;
  if (patch.width !== undefined) update.width = patch.width;
  if (patch.height !== undefined) update.height = patch.height;
  if (patch.color !== undefined) update.color = patch.color;
  if (patch.zIndex !== undefined) update.z_index = patch.zIndex;
  if (patch.pinned !== undefined) update.pinned = patch.pinned;
  if (patch.closed !== undefined) update.closed = patch.closed;

  const { data, error } = await supabase
    .from("user_post_it_tasks")
    .update(update)
    .eq("id", taskId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to update task" };

  revalidateDashboard();
  return { task: mapPostItRow(data as PostItTaskRow), error: null };
}

export async function updatePostItTask(
  taskId: string,
  patch: {
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
  },
  options?: UpdatePostItOptions
): Promise<{ error: string | null; task?: UserPostItTask }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error: patchError, patch: sanitized } = buildSanitizedPostItPatch(patch);
  if (patchError || !sanitized) return { error: patchError ?? "No changes" };

  if (!isPostItCacheEnabled()) {
    return updatePostItTaskInDatabase(user.id, taskId, sanitized);
  }

  try {
    const base = await loadOwnedPostItTask(user.id, taskId);
    if (!base) return { error: "Task not found" };

    const merged = await cachePostItUpdate(user.id, base, sanitized, {
      scheduleFlush: options?.flush !== "immediate",
    });

    if (options?.flush === "immediate") {
      await flushPostItTaskNow(user.id, taskId);
      const refreshed =
        (await getCachedPostItTask(user.id, taskId)) ?? merged;
      return { task: refreshed, error: null };
    }

    return { task: merged, error: null };
  } catch (err) {
    console.error("[post-it-cache] falling back to DB:", err);
    return updatePostItTaskInDatabase(user.id, taskId, sanitized);
  }
}

export async function deletePostItTask(
  taskId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("user_post_it_tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  await invalidatePostItCache(user.id, taskId);
  revalidateDashboard();
  return { error: null };
}

export async function addPostItItem(
  taskId: string,
  text: string
): Promise<{ error: string | null; task?: UserPostItTask }> {
  const trimmed = text.trim();
  if (!trimmed) return { error: "Item text is required" };
  if (trimmed.length > 200) return { error: "Item is too long" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const task = await loadOwnedPostItTask(user.id, taskId);
  if (!task) return { error: "Task not found" };

  const items: PostItItem[] = [
    ...task.items,
    { id: crypto.randomUUID(), text: trimmed, done: false },
  ];

  return updatePostItTask(taskId, { items });
}

export async function togglePostItItem(
  taskId: string,
  itemId: string
): Promise<{ error: string | null; task?: UserPostItTask }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const task = await loadOwnedPostItTask(user.id, taskId);
  if (!task) return { error: "Task not found" };

  const items = task.items.map((item) =>
    item.id === itemId ? { ...item, done: !item.done } : item
  );

  return updatePostItTask(taskId, { items });
}

export async function togglePostItTitle(
  taskId: string
): Promise<{ error: string | null; task?: UserPostItTask }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const task = await loadOwnedPostItTask(user.id, taskId);
  if (!task) return { error: "Task not found" };

  return updatePostItTask(taskId, { titleDone: !task.titleDone });
}

export async function togglePostItPin(
  taskId: string
): Promise<{ error: string | null; task?: UserPostItTask }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const task = await loadOwnedPostItTask(user.id, taskId);
  if (!task) return { error: "Task not found" };

  return updatePostItTask(taskId, { pinned: !task.pinned });
}

export async function bringPostItToFront(
  taskId: string
): Promise<{ error: string | null; task?: UserPostItTask }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const task = await loadOwnedPostItTask(user.id, taskId);
  if (!task) return { error: "Task not found" };

  let query = supabase
    .from("user_post_it_tasks")
    .select("z_index")
    .eq("user_id", user.id);

  if (task.roomId) {
    query = query.eq("room_id", task.roomId);
  }

  const { data: siblings } = await query;
  const maxZ = Math.max(...(siblings ?? []).map((t) => t.z_index ?? 0), 0);

  return updatePostItTask(taskId, { zIndex: maxZ + 1 });
}

async function getOwnedPostItTask(taskId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" as const, task: null };

  const task = await loadOwnedPostItTask(user.id, taskId);
  if (!task) return { error: "Task not found", task: null };
  return { error: null, task };
}

export async function closePostItTask(
  taskId: string
): Promise<{ error: string | null; task?: UserPostItTask }> {
  const { error, task } = await getOwnedPostItTask(taskId);
  if (error || !task) return { error: error ?? "Task not found" };

  const items = task.items.map((item) => ({ ...item, done: true }));

  return updatePostItTask(
    taskId,
    {
      closed: true,
      titleDone: true,
      items,
    },
    { flush: "immediate" }
  );
}

export async function reopenPostItTask(
  taskId: string
): Promise<{ error: string | null; task?: UserPostItTask }> {
  const { error, task } = await getOwnedPostItTask(taskId);
  if (error || !task) return { error: error ?? "Task not found" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  let query = supabase
    .from("user_post_it_tasks")
    .select("z_index")
    .eq("user_id", user.id);

  if (task.roomId) {
    query = query.eq("room_id", task.roomId);
  }

  const { data: siblings } = await query;
  const maxZ = Math.max(...(siblings ?? []).map((t) => t.z_index ?? 0), 0);

  const items = task.items.map((item) => ({ ...item, done: false }));

  return updatePostItTask(
    taskId,
    {
      closed: false,
      titleDone: false,
      items,
      zIndex: maxZ + 1,
    },
    { flush: "immediate" }
  );
}
