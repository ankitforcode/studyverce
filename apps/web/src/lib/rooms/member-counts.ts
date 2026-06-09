import type { AppSupabaseClient } from "@/lib/auth/server-session";

/** Aggregated member counts — one query instead of fetching every membership row. */
export async function fetchRoomMemberCounts(
  supabase: AppSupabaseClient,
  roomIds: string[]
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (roomIds.length === 0) return counts;

  const { data, error } = await supabase.rpc("get_room_member_counts", {
    p_room_ids: roomIds,
  });

  if (error || !data) return counts;

  for (const row of data as { room_id: string; member_count: number }[]) {
    counts.set(row.room_id, row.member_count);
  }

  return counts;
}
