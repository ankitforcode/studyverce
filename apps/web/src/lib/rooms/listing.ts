import { createClient } from "@/lib/supabase/server";
import type { StudyRoomSettings } from "@studyverse/shared";
import { mergeRoomSettings } from "@studyverse/db";

export type RoomListingItem = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  maxParticipants: number;
  memberCount: number;
  createdAt: string;
  thumbnailUrl: string;
  owner: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  mode: {
    label: string;
    type: "camera" | "focus" | "study";
  };
};

const DEFAULT_THUMBNAILS = [
  "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80",
  "https://images.unsplash.com/photo-1434030214721-735683854ff?w=800&q=80",
  "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80",
  "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&q=80",
  "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&q=80",
  "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&q=80",
];

function pickThumbnail(roomId: string, wallpaperUrl?: string | null): string {
  if (wallpaperUrl) return wallpaperUrl;
  const index = roomId.charCodeAt(0) % DEFAULT_THUMBNAILS.length;
  return DEFAULT_THUMBNAILS[index];
}

function resolveMode(settings: unknown): RoomListingItem["mode"] {
  const merged = mergeRoomSettings(settings as Partial<StudyRoomSettings> | undefined);
  if (merged.videoEnabled) {
    return { label: "Camera On", type: "camera" };
  }
  if (merged.pomodoroDefaults.focusMinutes >= 45) {
    return { label: "Study Mode", type: "study" };
  }
  return { label: "Focus Mode", type: "focus" };
}

export async function getPublicRooms(search?: string): Promise<RoomListingItem[]> {
  const supabase = await createClient();

  let query = supabase
    .from("study_rooms")
    .select("id, slug, name, description, is_public, max_participants, settings, created_at, owner_id, wallpaper_id")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    query = query.or(`name.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
  }

  const { data: rooms, error } = await query;
  if (error || !rooms?.length) return [];

  const ownerIds = [...new Set(rooms.map((r) => r.owner_id))];
  const wallpaperIds = rooms.map((r) => r.wallpaper_id).filter(Boolean) as string[];
  const roomIds = rooms.map((r) => r.id);

  const [{ data: profiles }, { data: wallpapers }, { data: members }] = await Promise.all([
    supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ownerIds),
    wallpaperIds.length
      ? supabase.from("room_wallpapers").select("id, image_url, thumbnail_url").in("id", wallpaperIds)
      : Promise.resolve({ data: [] as { id: string; image_url: string; thumbnail_url: string | null }[] }),
    supabase.from("room_members").select("room_id").in("room_id", roomIds),
  ]);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  const wallpaperMap = new Map(wallpapers?.map((w) => [w.id, w]) ?? []);

  const memberCounts = new Map<string, number>();
  for (const m of members ?? []) {
    memberCounts.set(m.room_id, (memberCounts.get(m.room_id) ?? 0) + 1);
  }

  return rooms.map((room) => {
    const owner = profileMap.get(room.owner_id);
    const wallpaper = room.wallpaper_id ? wallpaperMap.get(room.wallpaper_id) : null;
    const thumb = wallpaper?.thumbnail_url ?? wallpaper?.image_url ?? null;

    return {
      id: room.id,
      slug: room.slug,
      name: room.name,
      description: room.description,
      isPublic: room.is_public,
      maxParticipants: room.max_participants,
      memberCount: memberCounts.get(room.id) ?? 0,
      createdAt: room.created_at,
      thumbnailUrl: pickThumbnail(room.id, thumb),
      owner: {
        username: owner?.username ?? "host",
        displayName: owner?.display_name ?? "Host",
        avatarUrl: owner?.avatar_url ?? null,
      },
      mode: resolveMode(room.settings),
    };
  });
}

export async function getFriendRooms(_userId: string): Promise<RoomListingItem[]> {
  // Phase 2: filter by friends' active rooms
  return [];
}

export async function getFavoriteRooms(_userId: string): Promise<RoomListingItem[]> {
  // Phase 2: user-saved favorite rooms
  return [];
}
