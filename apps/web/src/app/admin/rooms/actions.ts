"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function updateAdminRoom(
  _prev: { error: string | null; success?: boolean },
  formData: FormData
): Promise<{ error: string | null; success?: boolean }> {
  await requireAdminSession();

  const roomId = String(formData.get("roomId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const description = String(formData.get("description") ?? "").trim();
  const isPublic = formData.get("is_public") === "on";
  const maxParticipants = Number(formData.get("max_participants") ?? 0);

  if (!roomId) return { error: "Missing room id." };
  if (!name) return { error: "Room name is required." };
  if (!slug || !SLUG_RE.test(slug)) {
    return { error: "Slug must be lowercase letters, numbers, and hyphens only." };
  }
  if (!Number.isFinite(maxParticipants) || maxParticipants < 2 || maxParticipants > 500) {
    return { error: "Max participants must be between 2 and 500." };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("study_rooms")
    .select("slug, invite_token")
    .eq("slug", slug)
    .neq("id", roomId)
    .maybeSingle();

  if (existing) {
    return { error: "That slug is already in use." };
  }

  const { data: currentRoom } = await supabase
    .from("study_rooms")
    .select("invite_token")
    .eq("id", roomId)
    .single();

  const inviteToken = isPublic
    ? null
    : (currentRoom?.invite_token ?? crypto.randomBytes(16).toString("hex"));

  const { error } = await supabase
    .from("study_rooms")
    .update({
      name,
      slug,
      description: description || null,
      is_public: isPublic,
      max_participants: maxParticipants,
      invite_token: inviteToken,
    })
    .eq("id", roomId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
  revalidatePath(`/rooms/${slug}`);
  return { error: null, success: true };
}

export async function deleteAdminRoom(
  _prev: { error: string | null; success?: boolean },
  formData: FormData
): Promise<{ error: string | null; success?: boolean }> {
  await requireAdminSession();

  const roomId = String(formData.get("roomId") ?? "");
  if (!roomId) return { error: "Missing room id." };

  const supabase = await createClient();
  const { error } = await supabase.from("study_rooms").delete().eq("id", roomId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
  return { error: null, success: true };
}
