import { createClient } from "@/lib/supabase/server";
import type { StudyRoomSettings } from "@studyverce/shared";
import { mergeRoomSettings } from "@studyverce/db";

export type RoomJoinState = "join" | "pending";
export type RoomListingRole = "owned" | "member" | "pending";

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
  inviteToken?: string | null;
  joinState?: RoomJoinState;
  listingRole?: RoomListingRole;
  owner: {
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  mode: {
    label: string;
    type: "camera" | "focus" | "study";
  };
  nowPlaying: {
    trackName: string;
    artist: string | null;
    isPlaying: boolean;
  } | null;
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
    .select(
      "id, slug, name, description, is_public, max_participants, settings, created_at, owner_id, wallpaper_id, track_id"
    )
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (search?.trim()) {
    query = query.or(`name.ilike.%${search.trim()}%,description.ilike.%${search.trim()}%`);
  }

  const { data: rooms, error } = await query;
  if (error || !rooms?.length) return [];

  const ownerIds = [...new Set(rooms.map((r) => r.owner_id))];
  const wallpaperIds = rooms.map((r) => r.wallpaper_id).filter(Boolean) as string[];
  const trackIds = [
    ...new Set(rooms.map((r) => r.track_id).filter(Boolean)),
  ] as string[];
  const roomIds = rooms.map((r) => r.id);

  const [{ data: profiles }, { data: wallpapers }, { data: members }, { data: tracks }] =
    await Promise.all([
      supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ownerIds),
      wallpaperIds.length
        ? supabase
            .from("room_wallpapers")
            .select("id, image_url, thumbnail_url")
            .in("id", wallpaperIds)
        : Promise.resolve({
            data: [] as { id: string; image_url: string; thumbnail_url: string | null }[],
          }),
      supabase.from("room_members").select("room_id").in("room_id", roomIds),
      trackIds.length
        ? supabase.from("room_tracks").select("id, name, artist").in("id", trackIds)
        : Promise.resolve({ data: [] as { id: string; name: string; artist: string | null }[] }),
    ]);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  const wallpaperMap = new Map(wallpapers?.map((w) => [w.id, w]) ?? []);
  const trackMap = new Map(tracks?.map((t) => [t.id, t]) ?? []);

  const memberCounts = new Map<string, number>();
  for (const m of members ?? []) {
    memberCounts.set(m.room_id, (memberCounts.get(m.room_id) ?? 0) + 1);
  }

  return rooms.map((room) => {
    const owner = profileMap.get(room.owner_id);
    const wallpaper = room.wallpaper_id ? wallpaperMap.get(room.wallpaper_id) : null;
    const thumb = wallpaper?.thumbnail_url ?? wallpaper?.image_url ?? null;
    const track = room.track_id ? trackMap.get(room.track_id) : null;
    const memberCount = memberCounts.get(room.id) ?? 0;

    return {
      id: room.id,
      slug: room.slug,
      name: room.name,
      description: room.description,
      isPublic: room.is_public,
      maxParticipants: room.max_participants,
      memberCount,
      createdAt: room.created_at,
      thumbnailUrl: pickThumbnail(room.id, thumb),
      owner: {
        username: owner?.username ?? "host",
        displayName: owner?.display_name ?? "Host",
        avatarUrl: owner?.avatar_url ?? null,
      },
      mode: resolveMode(room.settings),
      nowPlaying: track
        ? {
            trackName: track.name,
            artist: track.artist,
            isPlaying: memberCount > 0,
          }
        : null,
    };
  });
}

type AccessRoomRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  maxParticipants: number;
  memberCount: number;
  createdAt: string;
  inviteToken: string | null;
  ownerUsername: string;
  ownerDisplayName: string;
  ownerAvatarUrl: string | null;
  wallpaperUrl: string | null;
  trackName: string | null;
  trackArtist: string | null;
  settings: unknown;
  listingRole: RoomListingRole;
};

function mapAccessRoomRow(room: AccessRoomRow): RoomListingItem {
  return {
    id: room.id,
    slug: room.slug,
    name: room.name,
    description: room.description,
    isPublic: room.isPublic,
    maxParticipants: room.maxParticipants,
    memberCount: room.memberCount,
    createdAt: room.createdAt,
    thumbnailUrl: pickThumbnail(room.id, room.wallpaperUrl),
    inviteToken: room.inviteToken,
    joinState: room.listingRole === "pending" ? "pending" : "join",
    listingRole: room.listingRole,
    owner: {
      username: room.ownerUsername,
      displayName: room.ownerDisplayName,
      avatarUrl: room.ownerAvatarUrl,
    },
    mode: resolveMode(room.settings),
    nowPlaying: room.trackName
      ? {
          trackName: room.trackName,
          artist: room.trackArtist,
          isPlaying: room.memberCount > 0,
        }
      : null,
  };
}

export async function getPrivateRooms(_userId: string): Promise<RoomListingItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_user_private_rooms");

  if (error || !Array.isArray(data)) return [];

  return (data as AccessRoomRow[]).map(mapAccessRoomRow);
}

export async function getFriendRooms(_userId: string): Promise<RoomListingItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_user_friend_rooms");

  if (error || !Array.isArray(data)) return [];

  return (data as AccessRoomRow[]).map(mapAccessRoomRow);
}

export async function getFavoriteRooms(userId: string): Promise<RoomListingItem[]> {
  const supabase = await createClient();

  const { data: favorites, error: favError } = await supabase
    .from("user_favorite_rooms")
    .select("room_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (favError || !favorites?.length) return [];

  const roomIds = favorites.map((f) => f.room_id);
  const favoriteOrder = new Map(roomIds.map((id, index) => [id, index]));

  const { data: rooms, error } = await supabase
    .from("study_rooms")
    .select(
      "id, slug, name, description, is_public, max_participants, settings, created_at, owner_id, wallpaper_id, track_id"
    )
    .in("id", roomIds);

  if (error || !rooms?.length) return [];

  const ownerIds = [...new Set(rooms.map((r) => r.owner_id))];
  const wallpaperIds = rooms.map((r) => r.wallpaper_id).filter(Boolean) as string[];
  const trackIds = [
    ...new Set(rooms.map((r) => r.track_id).filter(Boolean)),
  ] as string[];
  const fetchedRoomIds = rooms.map((r) => r.id);

  const [{ data: profiles }, { data: wallpapers }, { data: members }, { data: tracks }] =
    await Promise.all([
      supabase.from("profiles").select("id, username, display_name, avatar_url").in("id", ownerIds),
      wallpaperIds.length
        ? supabase
            .from("room_wallpapers")
            .select("id, image_url, thumbnail_url")
            .in("id", wallpaperIds)
        : Promise.resolve({
            data: [] as { id: string; image_url: string; thumbnail_url: string | null }[],
          }),
      supabase.from("room_members").select("room_id").in("room_id", fetchedRoomIds),
      trackIds.length
        ? supabase.from("room_tracks").select("id, name, artist").in("id", trackIds)
        : Promise.resolve({ data: [] as { id: string; name: string; artist: string | null }[] }),
    ]);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  const wallpaperMap = new Map(wallpapers?.map((w) => [w.id, w]) ?? []);
  const trackMap = new Map(tracks?.map((t) => [t.id, t]) ?? []);

  const memberCounts = new Map<string, number>();
  for (const m of members ?? []) {
    memberCounts.set(m.room_id, (memberCounts.get(m.room_id) ?? 0) + 1);
  }

  const items = rooms.map((room) => {
    const owner = profileMap.get(room.owner_id);
    const wallpaper = room.wallpaper_id ? wallpaperMap.get(room.wallpaper_id) : null;
    const thumb = wallpaper?.thumbnail_url ?? wallpaper?.image_url ?? null;
    const track = room.track_id ? trackMap.get(room.track_id) : null;
    const memberCount = memberCounts.get(room.id) ?? 0;

    return {
      id: room.id,
      slug: room.slug,
      name: room.name,
      description: room.description,
      isPublic: room.is_public,
      maxParticipants: room.max_participants,
      memberCount,
      createdAt: room.created_at,
      thumbnailUrl: pickThumbnail(room.id, thumb),
      owner: {
        username: owner?.username ?? "host",
        displayName: owner?.display_name ?? "Host",
        avatarUrl: owner?.avatar_url ?? null,
      },
      mode: resolveMode(room.settings),
      nowPlaying: track
        ? {
            trackName: track.name,
            artist: track.artist,
            isPlaying: memberCount > 0,
          }
        : null,
    };
  });

  return items.sort(
    (a, b) => (favoriteOrder.get(a.id) ?? 0) - (favoriteOrder.get(b.id) ?? 0)
  );
}
