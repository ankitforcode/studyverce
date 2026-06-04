"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { mergeRoomSettings } from "@studyverce/db";
import {
  ALLOWED_WALLPAPER_TYPES,
  MAX_WALLPAPER_SIZE_BYTES,
  type RoomWallpaper,
  type StudyRoomSettings,
} from "@studyverce/shared";
import { clampWallpaperOverlay } from "@/lib/wallpaper-overlay";
import crypto from "crypto";

function mapWallpaper(row: {
  id: string;
  name: string;
  image_url: string;
  thumbnail_url: string | null;
  uploaded_by: string | null;
  is_public: boolean;
  is_builtin: boolean;
  category: string;
  created_at: string;
}): RoomWallpaper {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url,
    uploadedBy: row.uploaded_by,
    isPublic: row.is_public,
    isBuiltin: row.is_builtin,
    category: row.category,
    createdAt: row.created_at,
  };
}

export async function getWallpaperLibrary(category?: string): Promise<RoomWallpaper[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let query = supabase
    .from("room_wallpapers")
    .select("*")
    .order("is_builtin", { ascending: false })
    .order("created_at", { ascending: false });

  if (category && category !== "all") {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map(mapWallpaper);
}

export async function getMyWallpapers(): Promise<RoomWallpaper[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("room_wallpapers")
    .select("*")
    .eq("uploaded_by", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapWallpaper);
}

/** Random built-in wallpaper for new rooms (system library only). */
export async function pickRandomBuiltinWallpaperId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("room_wallpapers")
    .select("id")
    .eq("is_builtin", true);

  if (error || !data?.length) return null;

  return data[crypto.randomInt(0, data.length)].id;
}

export async function getRoomWallpaper(wallpaperId: string | null): Promise<RoomWallpaper | null> {
  if (!wallpaperId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("room_wallpapers")
    .select("*")
    .eq("id", wallpaperId)
    .maybeSingle();

  if (error || !data) return null;
  return mapWallpaper(data);
}

export async function uploadRoomWallpaper(
  _prev: { error: string | null; success: boolean },
  formData: FormData
): Promise<{ error: string | null; success: boolean; wallpaper?: RoomWallpaper }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in to upload wallpapers.", success: false };
  }

  const file = formData.get("file") as File | null;
  const name = (formData.get("name") as string)?.trim();
  const isPublic = formData.get("is_public") === "on";
  const category = (formData.get("category") as string) || "general";

  if (!file || file.size === 0) {
    return { error: "Please select an image file.", success: false };
  }

  if (!ALLOWED_WALLPAPER_TYPES.includes(file.type as (typeof ALLOWED_WALLPAPER_TYPES)[number])) {
    return { error: "Only JPEG, PNG, and WebP images are supported.", success: false };
  }

  if (file.size > MAX_WALLPAPER_SIZE_BYTES) {
    return { error: "Image must be 15 MB or smaller.", success: false };
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("room-wallpapers")
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message, success: false };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("room-wallpapers").getPublicUrl(storagePath);

  const { data: wallpaper, error: dbError } = await supabase
    .from("room_wallpapers")
    .insert({
      name: name || file.name.replace(/\.[^.]+$/, ""),
      image_url: publicUrl,
      storage_path: storagePath,
      thumbnail_url: publicUrl,
      uploaded_by: user.id,
      is_public: isPublic,
      is_builtin: false,
      category,
    })
    .select()
    .single();

  if (dbError) {
    await supabase.storage.from("room-wallpapers").remove([storagePath]);
    return { error: dbError.message, success: false };
  }

  return { error: null, success: true, wallpaper: mapWallpaper(wallpaper) };
}

export async function toggleWallpaperPublic(
  wallpaperId: string,
  isPublic: boolean
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("room_wallpapers")
    .update({ is_public: isPublic })
    .eq("id", wallpaperId)
    .eq("uploaded_by", user.id);

  if (error) return { error: error.message };
  revalidatePath("/rooms");
  return { error: null };
}

export async function setRoomWallpaper(
  roomId: string,
  wallpaperId: string | null
): Promise<{ error: string | null; imageUrl?: string | null }> {
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

  const { data: membership } = await supabase
    .from("room_members")
    .select("role")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  const canManage =
    room.owner_id === user.id ||
    membership?.role === "owner" ||
    membership?.role === "moderator";

  if (!canManage) {
    return { error: "Only room owners and moderators can change the background." };
  }

  if (wallpaperId) {
    const { data: wallpaper } = await supabase
      .from("room_wallpapers")
      .select("id, image_url, is_public, is_builtin, uploaded_by")
      .eq("id", wallpaperId)
      .single();

    if (!wallpaper) return { error: "Wallpaper not found" };

    const canUse =
      wallpaper.is_builtin ||
      wallpaper.is_public ||
      wallpaper.uploaded_by === user.id;

    if (!canUse) {
      return { error: "You do not have access to this wallpaper." };
    }
  }

  const { error } = await supabase
    .from("study_rooms")
    .update({ wallpaper_id: wallpaperId })
    .eq("id", roomId);

  if (error) return { error: error.message };

  let imageUrl: string | null = null;
  if (wallpaperId) {
    const wp = await getRoomWallpaper(wallpaperId);
    imageUrl = wp?.imageUrl ?? null;
  }

  revalidatePath("/rooms");
  return { error: null, imageUrl };
}

export async function setRoomWallpaperOverlayOpacity(
  roomId: string,
  overlayOpacity: number
): Promise<{ error: string | null; overlayOpacity?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: room } = await supabase
    .from("study_rooms")
    .select("owner_id, settings")
    .eq("id", roomId)
    .single();

  if (!room) return { error: "Room not found" };

  if (room.owner_id !== user.id) {
    return { error: "Only the room creator can change wallpaper opacity." };
  }

  const opacity = clampWallpaperOverlay(overlayOpacity);
  const settings = mergeRoomSettings(
    room.settings as Partial<StudyRoomSettings> | undefined
  );
  settings.wallpaperOverlayOpacity = opacity;

  const { error } = await supabase
    .from("study_rooms")
    .update({
      settings:
        settings as unknown as Database["public"]["Tables"]["study_rooms"]["Update"]["settings"],
    })
    .eq("id", roomId);

  if (error) return { error: error.message };

  revalidatePath("/rooms");
  return { error: null, overlayOpacity: opacity };
}

export async function deleteRoomWallpaper(
  wallpaperId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: wallpaper } = await supabase
    .from("room_wallpapers")
    .select("storage_path, uploaded_by, is_builtin")
    .eq("id", wallpaperId)
    .single();

  if (!wallpaper || wallpaper.is_builtin) {
    return { error: "Cannot delete this wallpaper." };
  }

  if (wallpaper.uploaded_by !== user.id) {
    return { error: "Not authorized." };
  }

  if (wallpaper.storage_path) {
    await supabase.storage.from("room-wallpapers").remove([wallpaper.storage_path]);
  }

  const { error } = await supabase
    .from("room_wallpapers")
    .delete()
    .eq("id", wallpaperId);

  if (error) return { error: error.message };
  return { error: null };
}
