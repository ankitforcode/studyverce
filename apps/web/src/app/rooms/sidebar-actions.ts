"use server";

import { unstable_noStore as noStore } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeSidebarPanelOrder } from "@/lib/room-sidebar";
import {
  DEFAULT_ROOM_SIDEBAR_PANEL_ORDER,
  type RoomSidebarPanelId,
} from "@studyverce/shared";

export async function getRoomSidebarPanelOrder(
  roomId: string
): Promise<RoomSidebarPanelId[]> {
  noStore();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [...DEFAULT_ROOM_SIDEBAR_PANEL_ORDER];
  }

  const { data, error } = await supabase
    .from("user_room_sidebar_layout")
    .select("panel_order")
    .eq("user_id", user.id)
    .eq("room_id", roomId)
    .maybeSingle();

  if (error || !data) {
    return [...DEFAULT_ROOM_SIDEBAR_PANEL_ORDER];
  }

  return normalizeSidebarPanelOrder(data.panel_order);
}

export async function saveRoomSidebarPanelOrder(
  roomId: string,
  order: RoomSidebarPanelId[]
): Promise<{ error: string | null }> {
  const normalized = normalizeSidebarPanelOrder(order);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { error } = await supabase.from("user_room_sidebar_layout").upsert(
    {
      user_id: user.id,
      room_id: roomId,
      panel_order: normalized,
    },
    { onConflict: "user_id,room_id" }
  );

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
