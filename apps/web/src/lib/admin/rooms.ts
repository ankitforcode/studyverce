import { createClient } from "@/lib/supabase/server";

export type AdminRoomRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  maxParticipants: number;
  memberCount: number;
  createdAt: string;
  owner: {
    id: string;
    username: string;
    displayName: string;
  };
};

export async function listAdminRooms(): Promise<AdminRoomRecord[]> {
  const supabase = await createClient();

  const { data: rooms, error } = await supabase
    .from("study_rooms")
    .select(
      "id, slug, name, description, is_public, max_participants, created_at, owner_id"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listAdminRooms:", error.message);
    return [];
  }

  if (!rooms?.length) return [];

  const ownerIds = [...new Set(rooms.map((r) => r.owner_id))];
  const roomIds = rooms.map((r) => r.id);

  const [{ data: profiles }, { data: members }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, display_name")
      .in("id", ownerIds),
    supabase.from("room_members").select("room_id").in("room_id", roomIds),
  ]);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  const memberCounts = new Map<string, number>();
  for (const m of members ?? []) {
    memberCounts.set(m.room_id, (memberCounts.get(m.room_id) ?? 0) + 1);
  }

  return rooms.map((room) => {
    const owner = profileMap.get(room.owner_id);
    return {
      id: room.id,
      slug: room.slug,
      name: room.name,
      description: room.description,
      isPublic: room.is_public,
      maxParticipants: room.max_participants,
      memberCount: memberCounts.get(room.id) ?? 0,
      createdAt: room.created_at,
      owner: {
        id: room.owner_id,
        username: owner?.username ?? "unknown",
        displayName: owner?.display_name ?? "Unknown",
      },
    };
  });
}
