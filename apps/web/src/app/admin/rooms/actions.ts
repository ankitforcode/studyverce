"use server";

import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/admin/auth";
import { createServiceClient } from "@/lib/supabase/service";

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

  const service = createServiceClient();

  const { data: existing } = await service
    .from("study_rooms")
    .select("slug")
    .eq("slug", slug)
    .neq("id", roomId)
    .maybeSingle();

  if (existing) {
    return { error: "That slug is already in use." };
  }

  const { error } = await service
    .from("study_rooms")
    .update({
      name,
      slug,
      description: description || null,
      is_public: isPublic,
      max_participants: maxParticipants,
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

  const service = createServiceClient();
  const { error } = await service.from("study_rooms").delete().eq("id", roomId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/rooms");
  revalidatePath("/rooms");
  return { error: null, success: true };
}
