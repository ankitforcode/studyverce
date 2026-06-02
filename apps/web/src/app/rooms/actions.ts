"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import {
  createRoomSchema,
  slugify,
  mergeRoomSettings,
  type CreateRoomInput,
} from "@studyverse/db";
import { PLAN_LIMITS } from "@studyverse/shared";
import crypto from "crypto";

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
    });

    if (profileError) {
      return { error: `Profile setup required: ${profileError.message}` };
    }
  }

  const { data: profileAfterEnsure } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", user.id)
    .single();

  if (!parsed.data.is_public) {
    const { count } = await supabase
      .from("study_rooms")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .eq("is_public", false);

    const limit = PLAN_LIMITS[(profileAfterEnsure?.plan_tier ?? "free") as keyof typeof PLAN_LIMITS].maxPrivateRooms;
    if ((count ?? 0) >= limit) {
      return { error: "Private room limit reached. Upgrade to Premium for unlimited private rooms." };
    }
  }

  let slug = slugify(parsed.data.name);
  if (!slug) {
    slug = `room-${crypto.randomBytes(4).toString("hex")}`;
  }
  const { data: existing } = await supabase
    .from("study_rooms")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    slug = `${slug}-${crypto.randomBytes(3).toString("hex")}`;
  }

  const settings = mergeRoomSettings(parsed.data.settings);
  const inviteToken = parsed.data.is_public ? null : crypto.randomBytes(16).toString("hex");

  const { data: room, error } = await supabase
    .from("study_rooms")
    .insert({
      slug,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      is_public: parsed.data.is_public,
      owner_id: user.id,
      max_participants: parsed.data.max_participants,
      settings: settings as unknown as Database["public"]["Tables"]["study_rooms"]["Insert"]["settings"],
      invite_token: inviteToken,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
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

  const { data: existing } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from("room_members").insert({
      room_id: roomId,
      user_id: user.id,
      role: "member",
    });
  }

  return { success: true };
}

export async function joinRoomByInvite(slug: string, token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/login?redirect=/rooms/${slug}`);
  }

  const { data: room } = await supabase
    .from("study_rooms")
    .select("id, invite_token")
    .eq("slug", slug)
    .single();

  if (!room || room.invite_token !== token) {
    return { error: "Invalid invite link" };
  }

  await joinRoom(room.id);
  redirect(`/rooms/${slug}`);
}
