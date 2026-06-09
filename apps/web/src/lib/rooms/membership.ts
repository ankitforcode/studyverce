import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export async function isUserRoomMember(
  supabase: SupabaseClient<Database>,
  roomId: string,
  userId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("room_members")
    .select("user_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  return Boolean(data);
}
