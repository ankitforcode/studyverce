"use server";

import { createClient } from "@/lib/supabase/server";

export type FriendListEntry = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  friendsSince: string;
};

export type PendingFriendRequest = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  direction: "received" | "sent";
  createdAt: string;
};

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

  if (error || !data) {
    if (error) console.error("getFriendshipStatuses:", error.message);
    return result;
  }

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

async function loadProfilesByIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userIds: string[]
) {
  if (userIds.length === 0) return new Map<string, { username: string; display_name: string; avatar_url: string | null }>();

  const { data } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);

  return new Map(
    (data ?? []).map((row) => [
      row.id,
      {
        username: row.username,
        display_name: row.display_name,
        avatar_url: row.avatar_url,
      },
    ])
  );
}

export async function getFriendsPageData(): Promise<{
  friends: FriendListEntry[];
  pending: PendingFriendRequest[];
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { friends: [], pending: [] };

  const { data: rows, error } = await supabase
    .from("friendships")
    .select("user_id, friend_id, status, created_at")
    .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

  if (error || !rows) {
    console.error("getFriendsPageData:", error?.message);
    return { friends: [], pending: [] };
  }

  const activeRows = rows.filter(
    (row) => row.status === "accepted" || row.status === "pending"
  );

  const otherIds = new Set<string>();
  for (const row of activeRows) {
    otherIds.add(row.user_id === user.id ? row.friend_id : row.user_id);
  }

  const profiles = await loadProfilesByIds(supabase, [...otherIds]);

  const friends: FriendListEntry[] = [];
  const pending: PendingFriendRequest[] = [];

  for (const row of activeRows) {
    const otherId = row.user_id === user.id ? row.friend_id : row.user_id;
    const profile = profiles.get(otherId);
    if (!profile) continue;

    if (row.status === "accepted") {
      friends.push({
        userId: otherId,
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        friendsSince: row.created_at,
      });
      continue;
    }

    if (row.status !== "pending") continue;

    pending.push({
      userId: otherId,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      direction: row.user_id === user.id ? "sent" : "received",
      createdAt: row.created_at,
    });
  }

  friends.sort((a, b) => a.displayName.localeCompare(b.displayName));
  pending.sort((a, b) => {
    if (a.direction !== b.direction) return a.direction === "received" ? -1 : 1;
    return a.displayName.localeCompare(b.displayName);
  });

  return { friends, pending };
}

export async function getPendingFriendRequestsInRoom(
  participantUserIds: string[]
): Promise<PendingFriendRequest[]> {
  const inRoom = new Set(participantUserIds);
  if (inRoom.size === 0) return [];

  const { pending } = await getFriendsPageData();
  return pending.filter(
    (request) => request.direction === "received" && inRoom.has(request.userId)
  );
}

export async function getPendingFriendRequestCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from("friendships")
    .select("*", { count: "exact", head: true })
    .eq("friend_id", user.id)
    .eq("status", "pending");

  if (error) {
    console.error("getPendingFriendRequestCount:", error.message);
    return 0;
  }

  return count ?? 0;
}

export async function acceptFriendRequest(
  requesterId: string
): Promise<{ error: string | null; status?: FriendshipUiStatus }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("user_id", requesterId)
    .eq("friend_id", user.id)
    .eq("status", "pending")
    .select("user_id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!data) return { error: "Friend request not found" };

  return { error: null, status: "accepted" };
}

export async function declineFriendRequest(
  requesterId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("user_id", requesterId)
    .eq("friend_id", user.id)
    .eq("status", "pending");

  if (error) return { error: error.message };
  return { error: null };
}
