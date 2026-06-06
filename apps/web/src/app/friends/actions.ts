"use server";

import { createClient } from "@/lib/supabase/server";

export type FriendshipUiStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "accepted"
  | "blocked";

export async function getFriendshipStatuses(
  userIds: string[]
): Promise<Record<string, FriendshipUiStatus>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const result: Record<string, FriendshipUiStatus> = {};
  for (const id of userIds) {
    result[id] = "none";
  }

  if (!user || userIds.length === 0) return result;

  const targetSet = new Set(userIds.filter((id) => id !== user.id));
  if (targetSet.size === 0) return result;

  const { data, error } = await supabase
    .from("friendships")
    .select("user_id, friend_id, status")
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  if (error || !data) return result;

  for (const row of data) {
    const otherId = row.user_id === user.id ? row.friend_id : row.user_id;
    if (!targetSet.has(otherId)) continue;

    if (row.status === "accepted" || row.status === "blocked") {
      result[otherId] = row.status;
      continue;
    }
    if (row.status === "pending") {
      result[otherId] =
        row.user_id === user.id ? "pending_sent" : "pending_received";
    }
  }

  return result;
}

export async function sendFriendRequest(
  friendId: string
): Promise<{ error: string | null; status?: FriendshipUiStatus }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  if (friendId === user.id) return { error: "You cannot add yourself" };

  const { data: rows } = await supabase
    .from("friendships")
    .select("user_id, friend_id, status")
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  const existing = rows?.find(
    (row) =>
      (row.user_id === user.id && row.friend_id === friendId) ||
      (row.user_id === friendId && row.friend_id === user.id)
  );

  if (existing) {
    if (existing.status === "accepted") {
      return { error: null, status: "accepted" };
    }
    if (existing.status === "blocked") {
      return { error: "Unable to send friend request" };
    }
    if (existing.status === "pending") {
      const status: FriendshipUiStatus =
        existing.user_id === user.id ? "pending_sent" : "pending_received";
      return {
        error: status === "pending_sent" ? null : "They already sent you a request",
        status,
      };
    }
  }

  const { error } = await supabase.from("friendships").insert({
    user_id: user.id,
    friend_id: friendId,
    status: "pending",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: null, status: "pending_sent" };
    }
    return { error: error.message };
  }

  return { error: null, status: "pending_sent" };
}
