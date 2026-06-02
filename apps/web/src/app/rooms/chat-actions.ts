"use server";

import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@studyverce/shared";

type MessageRow = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
};

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

async function enrichMessages(
  rows: MessageRow[],
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<ChatMessage[]> {
  if (rows.length === 0) return [];

  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map((profiles as ProfileRow[] | null)?.map((p) => [p.id, p]) ?? []);

  return rows.map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      id: row.id,
      roomId: row.room_id,
      userId: row.user_id,
      username: profile?.username ?? "unknown",
      displayName: profile?.display_name ?? "Unknown",
      avatarUrl: profile?.avatar_url ?? null,
      content: row.content,
      createdAt: row.created_at,
    };
  });
}

export async function getRoomChatHistory(roomId: string): Promise<ChatMessage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("room_messages")
    .select("id, room_id, user_id, content, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("getRoomChatHistory error:", error.message);
    return [];
  }

  return enrichMessages((data as MessageRow[]) ?? [], supabase);
}

export async function sendRoomMessage(
  roomId: string,
  content: string
): Promise<{ error: string | null; message?: ChatMessage }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const trimmed = content.trim();
  if (!trimmed) {
    return { error: "Message cannot be empty" };
  }

  const { data: member } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!member) {
    return { error: "You must be a member of this room to send messages" };
  }

  const { data, error } = await supabase
    .from("room_messages")
    .insert({
      room_id: roomId,
      user_id: user.id,
      content: trimmed,
    })
    .select("id, room_id, user_id, content, created_at")
    .single();

  if (error) {
    return { error: error.message };
  }

  const [message] = await enrichMessages([data as MessageRow], supabase);
  return { error: null, message };
}

export async function deleteRoomMessage(
  roomId: string,
  messageId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data: room } = await supabase
    .from("study_rooms")
    .select("owner_id")
    .eq("id", roomId)
    .single();

  const { data: membership } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: message } = await supabase
    .from("room_messages")
    .select("user_id")
    .eq("id", messageId)
    .eq("room_id", roomId)
    .single();

  if (!message) {
    return { error: "Message not found" };
  }

  const canDelete =
    message.user_id === user.id ||
    room?.owner_id === user.id ||
    membership?.role === "owner" ||
    membership?.role === "moderator";

  if (!canDelete) {
    return { error: "Not authorized to delete this message" };
  }

  const { error } = await supabase
    .from("room_messages")
    .delete()
    .eq("id", messageId)
    .eq("room_id", roomId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
