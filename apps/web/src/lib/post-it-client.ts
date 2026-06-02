import { createClient } from "@/lib/supabase/client";
import type { UserPostItTask } from "@studyverce/shared";
import { mapPostItRow, type PostItTaskRow } from "@/lib/post-it-mapper";

export async function fetchUserPostItTasks(): Promise<UserPostItTask[]> {
  const supabase = createClient();
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
    console.error("fetchUserPostItTasks:", error.message);
    return [];
  }

  return (data ?? []).map((row) => mapPostItRow(row as PostItTaskRow));
}

export async function fetchPostItsForRoom(
  roomId: string
): Promise<UserPostItTask[]> {
  const supabase = createClient();
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

export async function fetchPostItForRoom(
  roomId: string
): Promise<UserPostItTask | null> {
  const tasks = await fetchPostItsForRoom(roomId);
  return tasks[0] ?? null;
}
