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
  return data.map((row) => mapPostItRow(row as PostItTaskRow));
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
  return data.map((row) => mapPostItRow(row as PostItTaskRow));
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
  }
): Promise<{ error: string | null; task?: UserPostItTask }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

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
  if (patch.title !== undefined) {
    update.title = sanitizePostItTitle(patch.title);
    if (stripPostItHtml(update.title).length > 120) {
      return { error: "Title is too long" };
    }
  }
  if (patch.titleDone !== undefined) update.title_done = patch.titleDone;
  if (patch.items !== undefined) update.items = sanitizePostItItems(patch.items);
  if (patch.posX !== undefined) update.pos_x = patch.posX;
  if (patch.posY !== undefined) update.pos_y = patch.posY;
  if (patch.width !== undefined) update.width = clampPostItSize(patch.width);
  if (patch.height !== undefined) update.height = clampPostItSize(patch.height);
  if (patch.color !== undefined) update.color = patch.color;
  if (patch.zIndex !== undefined) update.z_index = patch.zIndex;
  if (patch.pinned !== undefined) update.pinned = patch.pinned;
  if (patch.closed !== undefined) update.closed = patch.closed;

  const { data, error } = await supabase
    .from("user_post_it_tasks")
    .update(update)
    .eq("id", taskId)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error || !data) return { error: error?.message ?? "Failed to update task" };

  revalidateDashboard();
  return { task: mapPostItRow(data as PostItTaskRow), error: null };
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

  const { data: existing, error: fetchError } = await supabase
    .from("user_post_it_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) return { error: "Task not found" };

  const task = mapPostItRow(existing as PostItTaskRow);
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

  const { data: existing, error: fetchError } = await supabase
    .from("user_post_it_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) return { error: "Task not found" };

  const task = mapPostItRow(existing as PostItTaskRow);
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

  const { data: existing, error: fetchError } = await supabase
    .from("user_post_it_tasks")
    .select("title_done")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) return { error: "Task not found" };

  return updatePostItTask(taskId, { titleDone: !existing.title_done });
}

export async function togglePostItPin(
  taskId: string
): Promise<{ error: string | null; task?: UserPostItTask }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: existing, error: fetchError } = await supabase
    .from("user_post_it_tasks")
    .select("pinned, room_id")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) return { error: "Task not found" };

  return updatePostItTask(taskId, { pinned: !existing.pinned });
}

export async function bringPostItToFront(
  taskId: string
): Promise<{ error: string | null; task?: UserPostItTask }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: existing, error: fetchError } = await supabase
    .from("user_post_it_tasks")
    .select("room_id")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) return { error: "Task not found" };

  let query = supabase
    .from("user_post_it_tasks")
    .select("z_index")
    .eq("user_id", user.id);

  if (existing.room_id) {
    query = query.eq("room_id", existing.room_id);
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

  const { data, error } = await supabase
    .from("user_post_it_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("user_id", user.id)
    .single();

  if (error || !data) return { error: "Task not found", task: null };
  return { error: null, task: mapPostItRow(data as PostItTaskRow) };
}

export async function closePostItTask(
  taskId: string
): Promise<{ error: string | null; task?: UserPostItTask }> {
  const { error, task } = await getOwnedPostItTask(taskId);
  if (error || !task) return { error: error ?? "Task not found" };

  const items = task.items.map((item) => ({ ...item, done: true }));

  return updatePostItTask(taskId, {
    closed: true,
    titleDone: true,
    items,
  });
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

  return updatePostItTask(taskId, {
    closed: false,
    titleDone: false,
    items,
    zIndex: maxZ + 1,
  });
}
