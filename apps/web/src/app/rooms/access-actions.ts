"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import type { RoomAccessRequest, RoomSharePreview } from "@studyverce/shared";
import { createClient } from "@/lib/supabase/server";
import { buildRoomShareUrl } from "@/lib/room-share";

type SharePreviewRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  maxParticipants: number;
  memberCount: number;
  ownerDisplayName: string;
  ownerId: string;
};

function mapSharePreview(row: SharePreviewRow): RoomSharePreview {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    isPublic: row.isPublic,
    maxParticipants: row.maxParticipants,
    memberCount: row.memberCount,
    ownerDisplayName: row.ownerDisplayName,
    ownerId: row.ownerId,
  };
}

export async function getRoomSharePreview(
  slug: string,
  inviteToken?: string | null
): Promise<RoomSharePreview | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_room_share_preview", {
    p_slug: slug,
    p_token: inviteToken ?? null,
  });

  if (error) {
    console.error("getRoomSharePreview:", error.message);
    return null;
  }

  if (!data || typeof data !== "object") return null;
  return mapSharePreview(data as SharePreviewRow);
}

export async function getRoomShareLink(
  roomId: string
): Promise<{ url: string | null; error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { url: null, error: "Not authenticated" };

  const { data: room, error } = await supabase
    .from("study_rooms")
    .select("slug, is_public, invite_token, owner_id")
    .eq("id", roomId)
    .single();

  if (error || !room) return { url: null, error: "Room not found" };

  const isOwner = room.owner_id === user.id;

  if (!room.is_public) {
    if (!isOwner) {
      return { url: null, error: "Only the room owner can copy the private share link." };
    }
  } else if (!isOwner) {
    const { data: membership } = await supabase
      .from("room_members")
      .select("room_id")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return { url: null, error: "Join the room to share it." };
    }
  }

  return {
    url: buildRoomShareUrl(room.slug, room.is_public, room.invite_token),
    error: null,
  };
}

export async function getRoomVisibility(
  roomId: string
): Promise<{
  error: string | null;
  isPublic?: boolean;
  inviteToken?: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: room, error } = await supabase
    .from("study_rooms")
    .select("is_public, invite_token")
    .eq("id", roomId)
    .single();

  if (error || !room) return { error: "Room not found" };

  return {
    error: null,
    isPublic: room.is_public,
    inviteToken: room.invite_token,
  };
}

export async function setRoomVisibility(
  roomId: string,
  isPublic: boolean
): Promise<{
  error: string | null;
  isPublic?: boolean;
  inviteToken?: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: room } = await supabase
    .from("study_rooms")
    .select("slug, owner_id, invite_token")
    .eq("id", roomId)
    .single();

  if (!room) return { error: "Room not found" };
  if (room.owner_id !== user.id) {
    return { error: "Only the room owner can change visibility." };
  }

  const inviteToken = isPublic
    ? null
    : (room.invite_token ?? crypto.randomBytes(16).toString("hex"));

  const { error } = await supabase
    .from("study_rooms")
    .update({
      is_public: isPublic,
      invite_token: inviteToken,
    })
    .eq("id", roomId);

  if (error) return { error: error.message };

  revalidatePath("/rooms");
  revalidatePath(`/rooms/${room.slug}`);
  revalidatePath(`/rooms/${room.slug}/invite`);
  return { error: null, isPublic, inviteToken };
}

type RoomAccessState = {
  hasMembership: boolean;
  accessStatus: RoomAccessRequest["status"] | null;
  roomName: string;
  roomId: string;
  isPublic: boolean;
};

export async function getRoomAccessStateForUser(
  slug: string
): Promise<RoomAccessState | null> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("get_room_access_state_for_user", {
    p_slug: slug,
  });

  if (error) {
    console.error("getRoomAccessStateForUser:", error.message);
    return null;
  }

  if (!data || typeof data !== "object") return null;
  return data as RoomAccessState;
}

export async function getMyRoomAccessStatus(
  roomId: string
): Promise<RoomAccessRequest["status"] | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("room_access_requests")
    .select("status")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.status as RoomAccessRequest["status"] | undefined) ?? null;
}

export async function requestRoomAccess(
  slug: string,
  inviteToken: string
): Promise<{
  error: string | null;
  success?: boolean;
  request?: RoomAccessRequest;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const preview = await getRoomSharePreview(slug, inviteToken);
  if (!preview) return { error: "Invalid share link." };
  if (preview.isPublic) {
    return { error: "Public rooms do not require access requests." };
  }
  if (preview.ownerId === user.id) return { error: "You already own this room." };

  const roomId = preview.id;

  const { data: member } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (member) return { error: "You are already a member of this room." };

  const { data: latestAccess } = await supabase
    .from("room_access_requests")
    .select("status")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestAccess?.status === "revoked") {
    return { error: "The room owner removed you. You cannot request access again." };
  }

  if (latestAccess?.status === "approved") {
    return { error: "You already have access. Open the room to rejoin." };
  }

  const { count } = await supabase
    .from("room_members")
    .select("room_id", { count: "exact", head: true })
    .eq("room_id", roomId);

  if ((count ?? 0) >= preview.maxParticipants) {
    return { error: "This room is full." };
  }

  const { data: existing } = await supabase
    .from("room_access_requests")
    .select("id, status")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing) {
    return { error: "Your access request is already pending." };
  }

  const { data: inserted, error } = await supabase
    .from("room_access_requests")
    .insert({
      room_id: roomId,
      user_id: user.id,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "Your access request is already pending." };
    }
    return { error: error.message };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  revalidatePath(`/rooms/${slug}/invite`);
  revalidatePath("/rooms");
  return {
    error: null,
    success: true,
    request: {
      id: inserted.id,
      roomId: inserted.room_id,
      userId: inserted.user_id,
      status: inserted.status as RoomAccessRequest["status"],
      reviewedBy: inserted.reviewed_by,
      reviewedAt: inserted.reviewed_at,
      createdAt: inserted.created_at,
      requesterName: profile?.display_name,
      requesterUsername: profile?.username,
    } satisfies RoomAccessRequest,
  };
}

export async function getPendingAccessRequests(
  roomId: string
): Promise<RoomAccessRequest[]> {
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
    .from("room_access_requests")
    .select("*")
    .eq("room_id", roomId)
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error || !data?.length) return [];

  const userIds = [...new Set(data.map((row) => row.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .in("id", userIds);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return data.map((row) => {
    const profile = profileById.get(row.user_id);
    return {
      id: row.id,
      roomId: row.room_id,
      userId: row.user_id,
      status: row.status as RoomAccessRequest["status"],
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      requesterName: profile?.display_name,
      requesterUsername: profile?.username,
    };
  });
}

type ApproveAccessResult = {
  error: string | null;
  slug?: string;
  requestId?: string;
  roomId?: string;
  userId?: string;
  status?: "approved";
};

export async function approveAccessRequest(
  requestId: string
): Promise<ApproveAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data, error } = await supabase.rpc("approve_room_access_request", {
    p_request_id: requestId,
  });

  if (error) {
    return { error: error.message };
  }

  if (!data || typeof data !== "object") {
    return { error: "Failed to approve access request." };
  }

  const result = data as ApproveAccessResult;
  if (result.error) {
    return { error: result.error };
  }

  if (result.slug) {
    revalidatePath(`/rooms/${result.slug}`);
    revalidatePath(`/rooms/${result.slug}/invite`);
    revalidatePath("/rooms");
  }

  return {
    error: null,
    slug: result.slug,
    requestId: result.requestId,
    roomId: result.roomId,
    userId: result.userId,
    status: "approved",
  };
}

export async function rejectAccessRequest(
  requestId: string
): Promise<{
  error: string | null;
  requestId?: string;
  roomId?: string;
  userId?: string;
  status?: "rejected";
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: request } = await supabase
    .from("room_access_requests")
    .select("room_id, user_id, status")
    .eq("id", requestId)
    .single();

  if (!request || request.status !== "pending") {
    return { error: "Request not found or already reviewed." };
  }

  const { data: room } = await supabase
    .from("study_rooms")
    .select("owner_id, slug")
    .eq("id", request.room_id)
    .single();

  if (!room || room.owner_id !== user.id) {
    return { error: "Only the room owner can reject access requests." };
  }

  const { error } = await supabase
    .from("room_access_requests")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) return { error: error.message };

  revalidatePath(`/rooms/${room.slug}`);
  revalidatePath(`/rooms/${room.slug}/invite`);
  revalidatePath("/rooms");
  return {
    error: null,
    requestId,
    roomId: request.room_id,
    userId: request.user_id,
    status: "rejected" as const,
  };
}
