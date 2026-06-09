"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { invalidateRoomMemberAuth } from "@studyverce/redis";
import "@/lib/redis";
import type { Database } from "@/lib/supabase/database.types";
import {
  createRoomSchema,
  slugify,
  mergeRoomSettings,
  type CreateRoomInput,
} from "@studyverce/db";
import { PLAN_LIMITS } from "@studyverce/shared";
import crypto from "crypto";
import { pickRandomBuiltinWallpaperId } from "@/app/rooms/wallpaper-actions";
import {
  assertRoomHasMemberCapacity,
  capMaxParticipantsForPlan,
  fetchUserPlanTier,
} from "@/lib/plan-limits";

const MAX_ROOM_SLUG_ATTEMPTS = 8;

function isStudyRoomSlugConflict(error: {
  code?: string;
  message?: string;
  details?: string;
}): boolean {
  if (error.code !== "23505") return false;
  const text = `${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  return text.includes("study_rooms_slug_key") || text.includes("(slug)");
}

function roomSlugForAttempt(baseSlug: string, attempt: number): string {
  if (attempt === 0) return baseSlug;
  const suffix = crypto.randomBytes(4).toString("hex");
  const maxBaseLen = Math.max(1, 60 - 1 - suffix.length);
  return `${baseSlug.slice(0, maxBaseLen)}-${suffix}`;
}

export async function createRoom(input: CreateRoomInput) {
  const parsed = createRoomSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    const fallbackUsername = `user_${user.id.replace(/-/g, "").slice(0, 8)}`;
    const { error: profileError } = await supabase.from("profiles").insert({
      id: user.id,
      username: fallbackUsername,
      display_name: user.email?.split("@")[0] ?? "Student",
      referral_code: fallbackUsername,
    });

    if (profileError) {
      return { error: `Profile setup required: ${profileError.message}` };
    }
  }

  const ownerPlanTier = await fetchUserPlanTier(supabase, user.id);

  if (!parsed.data.is_public) {
    const { count } = await supabase
      .from("study_rooms")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("is_public", false);

    const limit = PLAN_LIMITS[ownerPlanTier].maxPrivateRooms;
    if ((count ?? 0) >= limit) {
      return { error: "Private room limit reached. Upgrade to Premium for unlimited private rooms." };
    }
  }

  const baseSlug =
    slugify(parsed.data.name) || `room-${crypto.randomBytes(4).toString("hex")}`;

  const settings = mergeRoomSettings(parsed.data.settings);
  const inviteToken = parsed.data.is_public ? null : crypto.randomBytes(16).toString("hex");
  const wallpaperId = await pickRandomBuiltinWallpaperId();
  const maxParticipants = capMaxParticipantsForPlan(
    ownerPlanTier,
    parsed.data.max_participants
  );

  let room: Database["public"]["Tables"]["study_rooms"]["Row"] | null = null;
  for (let attempt = 0; attempt < MAX_ROOM_SLUG_ATTEMPTS; attempt++) {
    const slug = roomSlugForAttempt(baseSlug, attempt);
    const { data, error } = await supabase
      .from("study_rooms")
      .insert({
        slug,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        is_public: parsed.data.is_public,
        owner_id: user.id,
        max_participants: maxParticipants,
        wallpaper_id: wallpaperId,
        settings: settings as unknown as Database["public"]["Tables"]["study_rooms"]["Insert"]["settings"],
        invite_token: inviteToken,
      })
      .select()
      .single();

    if (!error) {
      room = data;
      break;
    }

    if (isStudyRoomSlugConflict(error)) {
      continue;
    }

    return { error: error.message };
  }

  if (!room) {
    return {
      error: "Could not create a unique room URL. Try a different name.",
    };
  }

  const { error: memberError } = await supabase.from("room_members").insert({
    room_id: room.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    return { error: memberError.message };
  }

  revalidatePath("/rooms");
  redirect(`/rooms/${room.slug}`);
}

export async function joinRoom(roomId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: room } = await supabase
    .from("study_rooms")
    .select("is_public, owner_id")
    .eq("id", roomId)
    .single();

  if (!room) {
    return { error: "Room not found" };
  }

  if (!room.is_public && room.owner_id !== user.id) {
    const { data: access } = await supabase
      .from("room_access_requests")
      .select("status")
      .eq("room_id", roomId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (access?.status !== "approved") {
      return { error: "You do not have access to this private room." };
    }
  }

  const { data: existing } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const capacity = await assertRoomHasMemberCapacity(supabase, roomId);
    if (!capacity.ok) {
      return { error: capacity.error };
    }

    const { error } = await supabase.from("room_members").insert({
      room_id: roomId,
      user_id: user.id,
      role: "member",
    });
    if (error) {
      return { error: error.message };
    }
    await invalidateRoomMemberAuth(roomId, user.id);
  }

  return { success: true };
}

/** @deprecated Use /rooms/[slug]/invite?token=… and requestRoomAccess instead. */
export async function joinRoomByInvite(slug: string, token: string) {
  redirect(`/rooms/${slug}/invite?token=${encodeURIComponent(token)}`);
}
