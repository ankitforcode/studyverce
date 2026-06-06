"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  type RoomTrack,
  type RoomTrackRequest,
} from "@studyverce/shared";
import { parseMusicProviderUrl } from "@/lib/music/providers";

function mapTrack(row: {
  id: string;
  name: string;
  artist: string | null;
  audio_url: string;
  cover_url: string | null;
  duration_seconds: number | null;
  uploaded_by: string | null;
  is_public: boolean;
  is_builtin: boolean;
  category: string;
  provider?: string;
  external_id?: string | null;
  source_url?: string | null;
  created_at: string;
}): RoomTrack {
  return {
    id: row.id,
    name: row.name,
    artist: row.artist,
    audioUrl: row.audio_url,
    coverUrl: row.cover_url,
    durationSeconds: row.duration_seconds,
    uploadedBy: row.uploaded_by,
    isPublic: row.is_public,
    isBuiltin: row.is_builtin,
    category: row.category,
    provider: (row.provider ?? (row.is_builtin ? "builtin" : "direct")) as RoomTrack["provider"],
    externalId: row.external_id ?? null,
    sourceUrl: row.source_url ?? null,
    createdAt: row.created_at,
  };
}

async function canAccessTrack(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trackId: string,
  userId: string
): Promise<boolean> {
  const { data: track } = await supabase
    .from("room_tracks")
    .select("is_public, is_builtin, uploaded_by")
    .eq("id", trackId)
    .single();

  if (!track) return false;
  return track.is_builtin || track.is_public || track.uploaded_by === userId;
}

async function isRoomMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomId: string,
  userId: string
): Promise<boolean> {
  const { data: room } = await supabase
    .from("study_rooms")
    .select("owner_id")
    .eq("id", roomId)
    .single();

  if (!room) return false;
  if (room.owner_id === userId) return true;

  const { data: membership } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  return !!membership;
}

export async function getTrackLibrary(category?: string): Promise<RoomTrack[]> {
  const supabase = await createClient();

  let query = supabase
    .from("room_tracks")
    .select("*")
    .order("is_builtin", { ascending: false })
    .order("created_at", { ascending: false });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTrack);
}

export async function getMyTracks(): Promise<RoomTrack[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("room_tracks")
    .select("*")
    .eq("uploaded_by", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTrack);
}

export async function getRoomTrack(trackId: string | null): Promise<RoomTrack | null> {
  if (!trackId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("room_tracks")
    .select("*")
    .eq("id", trackId)
    .maybeSingle();

  if (error || !data) return null;
  return mapTrack(data);
}

export async function addProviderTrackLink(
  _prev: { error: string | null; success: boolean },
  formData: FormData
): Promise<{ error: string | null; success: boolean; track?: RoomTrack }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to add tracks.", success: false };
  }

  const sourceUrl = (formData.get("source_url") as string)?.trim();
  const name = (formData.get("name") as string)?.trim();
  const artist = (formData.get("artist") as string)?.trim() || null;
  const isPublic = formData.get("is_public") === "on";
  const category = (formData.get("category") as string) || "ambient";

  if (!sourceUrl) {
    return {
      error: "Paste a SoundCloud, YouTube, Spotify, or Apple Music link.",
      success: false,
    };
  }

  const parsed = parseMusicProviderUrl(sourceUrl);
  if (!parsed) {
    return {
      error:
        "Unsupported link. Use SoundCloud, YouTube, YouTube Music, Spotify, or Apple Music URLs.",
      success: false,
    };
  }

  const { data: track, error: dbError } = await supabase
    .from("room_tracks")
    .insert({
      name: name || parsed.defaultName,
      artist,
      audio_url: parsed.embedUrl,
      uploaded_by: user.id,
      is_public: isPublic,
      is_builtin: false,
      category,
      provider: parsed.provider,
      external_id: parsed.externalId,
      source_url: parsed.sourceUrl,
    })
    .select()
    .single();

  if (dbError) {
    return { error: dbError.message, success: false };
  }

  return { error: null, success: true, track: mapTrack(track) };
}

export async function toggleTrackPublic(
  trackId: string,
  isPublic: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("room_tracks")
    .update({ is_public: isPublic })
    .eq("id", trackId)
    .eq("uploaded_by", user.id);

  if (error) return { error: error.message };
  return { error: null };
}

export async function updateRoomTrack(
  trackId: string,
  input: {
    name: string;
    artist?: string | null;
    category?: string;
    isPublic?: boolean;
    sourceUrl?: string | null;
  }
): Promise<{ error: string | null; track?: RoomTrack }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const name = input.name.trim();
  if (!name) return { error: "Track title is required." };
  if (name.length > 80) return { error: "Title must be 80 characters or less." };

  const { data: existing } = await supabase
    .from("room_tracks")
    .select("uploaded_by, is_builtin, source_url, provider")
    .eq("id", trackId)
    .single();

  if (!existing || existing.is_builtin) {
    return { error: "This track cannot be edited." };
  }

  if (existing.uploaded_by !== user.id) {
    return { error: "You can only edit your own tracks." };
  }

  const artist = input.artist?.trim() || null;
  const category = input.category?.trim() || "ambient";
  const isPublic = input.isPublic ?? false;

  const updates: {
    name: string;
    artist: string | null;
    category: string;
    is_public: boolean;
    source_url?: string;
    audio_url?: string;
    provider?: string;
    external_id?: string;
  } = {
    name,
    artist,
    category,
    is_public: isPublic,
  };

  const sourceUrl = input.sourceUrl?.trim();
  if (sourceUrl && sourceUrl !== existing.source_url) {
    const parsed = parseMusicProviderUrl(sourceUrl);
    if (!parsed) {
      return { error: "Invalid provider URL. Use SoundCloud, YouTube, or Spotify links." };
    }
    updates.source_url = parsed.sourceUrl;
    updates.audio_url = parsed.embedUrl;
    updates.provider = parsed.provider;
    updates.external_id = parsed.externalId;
  }

  const { data: track, error } = await supabase
    .from("room_tracks")
    .update(updates)
    .eq("id", trackId)
    .eq("uploaded_by", user.id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, track: mapTrack(track) };
}

export async function deleteRoomTrack(trackId: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: track } = await supabase
    .from("room_tracks")
    .select("storage_path, uploaded_by, is_builtin, provider")
    .eq("id", trackId)
    .single();

  if (!track || track.is_builtin) {
    return { error: "Cannot delete this track." };
  }

  if (track.uploaded_by !== user.id) {
    return { error: "Not authorized." };
  }

  if (track.storage_path && track.provider === "direct") {
    await supabase.storage.from("room-music").remove([track.storage_path]);
  }

  const { error } = await supabase.from("room_tracks").delete().eq("id", trackId);
  if (error) return { error: error.message };
  return { error: null };
}

export async function requestRoomTrack(
  roomId: string,
  trackId: string
): Promise<{
  error: string | null;
  success?: boolean;
  request?: RoomTrackRequest;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const member = await isRoomMember(supabase, roomId, user.id);
  if (!member) return { error: "You must be a room member to request music." };

  const accessible = await canAccessTrack(supabase, trackId, user.id);
  if (!accessible) return { error: "You do not have access to this track." };

  const { data: room } = await supabase
    .from("study_rooms")
    .select("owner_id")
    .eq("id", roomId)
    .single();

  if (room?.owner_id === user.id) {
    return { error: "Room owners can play tracks directly without requesting." };
  }

  const { data: existing } = await supabase
    .from("room_track_requests")
    .select("id")
    .eq("room_id", roomId)
    .eq("track_id", trackId)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { error: "This track is already pending approval." };
  }

  const { data: inserted, error } = await supabase
    .from("room_track_requests")
    .insert({
      room_id: roomId,
      track_id: trackId,
      requested_by: user.id,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "This track is already pending approval." };
    }
    return { error: error.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  const track = await getRoomTrack(trackId);

  return {
    error: null,
    success: true,
    request: {
      id: inserted.id,
      roomId: inserted.room_id,
      trackId: inserted.track_id,
      requestedBy: inserted.requested_by,
      status: inserted.status as RoomTrackRequest["status"],
      reviewedBy: inserted.reviewed_by,
      reviewedAt: inserted.reviewed_at,
      createdAt: inserted.created_at,
      track: track ?? undefined,
      requesterName: profile?.display_name,
      requesterUsername: profile?.username,
    } satisfies RoomTrackRequest,
  };
}

export async function getPendingTrackRequests(roomId: string): Promise<RoomTrackRequest[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: room } = await supabase
    .from("study_rooms")
    .select("owner_id")
    .eq("id", roomId)
    .single();

  if (!room || room.owner_id !== user.id) return [];

  const { data, error } = await supabase
    .from("room_track_requests")
    .select("*")
    .eq("room_id", roomId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const trackIds = [...new Set(data.map((r) => r.track_id))];
  const requesterIds = [...new Set(data.map((r) => r.requested_by))];

  const [{ data: tracks }, { data: profiles }] = await Promise.all([
    supabase.from("room_tracks").select("*").in("id", trackIds),
    supabase
      .from("profiles")
      .select("id, display_name, username")
      .in("id", requesterIds),
  ]);

  const trackById = new Map((tracks ?? []).map((t) => [t.id, mapTrack(t)]));
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return data.map((row) => {
    const profile = profileById.get(row.requested_by);
    return {
      id: row.id,
      roomId: row.room_id,
      trackId: row.track_id,
      requestedBy: row.requested_by,
      status: row.status as RoomTrackRequest["status"],
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      track: trackById.get(row.track_id),
      requesterName: profile?.display_name,
      requesterUsername: profile?.username,
    };
  });
}

async function applyRoomTrack(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomId: string,
  trackId: string | null
): Promise<{ error: string | null; track?: RoomTrack | null }> {
  const { error } = await supabase
    .from("study_rooms")
    .update({ track_id: trackId })
    .eq("id", roomId);

  if (error) return { error: error.message };

  if (!trackId) return { error: null, track: null };

  const track = await getRoomTrack(trackId);
  return { error: null, track };
}

export async function approveTrackRequest(
  requestId: string
): Promise<{
  error: string | null;
  track?: RoomTrack | null;
  requestId?: string;
  roomId?: string;
  requestedBy?: string;
  status?: "approved";
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: request } = await supabase
    .from("room_track_requests")
    .select("id, room_id, track_id, requested_by, status")
    .eq("id", requestId)
    .single();

  if (!request || request.status !== "pending") {
    return { error: "Request not found or already reviewed." };
  }

  const { data: room } = await supabase
    .from("study_rooms")
    .select("owner_id")
    .eq("id", request.room_id)
    .single();

  if (!room || room.owner_id !== user.id) {
    return { error: "Only the room owner can approve music requests." };
  }

  const now = new Date().toISOString();

  await supabase
    .from("room_track_requests")
    .update({ status: "rejected", reviewed_by: user.id, reviewed_at: now })
    .eq("room_id", request.room_id)
    .eq("status", "pending")
    .neq("id", requestId);

  const { error: reviewError } = await supabase
    .from("room_track_requests")
    .update({ status: "approved", reviewed_by: user.id, reviewed_at: now })
    .eq("id", requestId);

  if (reviewError) return { error: reviewError.message };

  const result = await applyRoomTrack(supabase, request.room_id, request.track_id);
  revalidatePath("/rooms");
  return {
    ...result,
    requestId,
    roomId: request.room_id,
    requestedBy: request.requested_by,
    status: "approved" as const,
  };
}

export async function rejectTrackRequest(requestId: string): Promise<{
  error: string | null;
  requestId?: string;
  roomId?: string;
  requestedBy?: string;
  status?: "rejected";
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: request } = await supabase
    .from("room_track_requests")
    .select("room_id, requested_by, status")
    .eq("id", requestId)
    .single();

  if (!request || request.status !== "pending") {
    return { error: "Request not found or already reviewed." };
  }

  const { data: room } = await supabase
    .from("study_rooms")
    .select("owner_id")
    .eq("id", request.room_id)
    .single();

  if (!room || room.owner_id !== user.id) {
    return { error: "Only the room owner can reject music requests." };
  }

  const { error } = await supabase
    .from("room_track_requests")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) return { error: error.message };
  return {
    error: null,
    requestId,
    roomId: request.room_id,
    requestedBy: request.requested_by,
    status: "rejected" as const,
  };
}

export async function setRoomTrack(
  roomId: string,
  trackId: string | null
): Promise<{ error: string | null; track?: RoomTrack | null }> {
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
    return { error: "Only the room owner can set music directly." };
  }

  if (trackId) {
    const accessible = await canAccessTrack(supabase, trackId, user.id);
    if (!accessible) return { error: "You do not have access to this track." };
  }

  const result = await applyRoomTrack(supabase, roomId, trackId);
  revalidatePath("/rooms");
  return result;
}

export async function clearRoomTrack(roomId: string): Promise<{ error: string | null }> {
  return setRoomTrack(roomId, null);
}
