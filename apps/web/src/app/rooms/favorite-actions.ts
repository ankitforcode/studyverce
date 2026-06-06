"use server";

import { createClient } from "@/lib/supabase/server";

export async function getFavoriteRoomIds(): Promise<string[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("user_favorite_rooms")
    .select("room_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((row) => row.room_id);
}

export async function isRoomFavorited(roomId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data } = await supabase
    .from("user_favorite_rooms")
    .select("room_id")
    .eq("user_id", user.id)
    .eq("room_id", roomId)
    .maybeSingle();

  return !!data;
}

export async function toggleRoomFavorite(
  roomId: string
): Promise<{ error: string | null; favorited?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: room } = await supabase
    .from("study_rooms")
    .select("id, slug, is_public, owner_id")
    .eq("id", roomId)
    .single();

  if (!room) return { error: "Room not found" };

  const isOwner = room.owner_id === user.id;
  if (!room.is_public && !isOwner) {
    const { data: membership } = await supabase
      .from("room_members")
      .select("room_id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return { error: "You can only favorite rooms you can access." };
    }
  }

  const { data: existing } = await supabase
    .from("user_favorite_rooms")
    .select("room_id")
    .eq("user_id", user.id)
    .eq("room_id", roomId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_favorite_rooms")
      .delete()
      .eq("user_id", user.id)
      .eq("room_id", roomId);

    if (error) return { error: error.message };
    return { error: null, favorited: false };
  }

  const { error } = await supabase.from("user_favorite_rooms").insert({
    user_id: user.id,
    room_id: roomId,
  });

  if (error) return { error: error.message };

  return { error: null, favorited: true };
}
