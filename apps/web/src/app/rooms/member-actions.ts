"use server";

import { createClient } from "@/lib/supabase/server";

export async function kickRoomMember(
  roomId: string,
  userId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: room } = await supabase
    .from("study_rooms")
    .select("owner_id")
    .eq("id", roomId)
    .single();

  if (!room) return { error: "Room not found" };
  if (room.owner_id !== user.id) {
    return { error: "Only the room owner can remove members" };
  }
  if (userId === user.id) return { error: "You cannot remove yourself" };
  if (userId === room.owner_id) return { error: "Cannot remove the room owner" };

  const { error } = await supabase
    .from("room_members")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (error) return { error: error.message };

  return { error: null };
}
