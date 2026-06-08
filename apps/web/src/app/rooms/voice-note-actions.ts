"use server";

import crypto from "crypto";
import { revalidatePath } from "next/cache";
import type { RoomVoiceNote } from "@studyverce/shared";
import { createClient } from "@/lib/supabase/server";
import {
  fetchUserPlanTier,
  hasVoiceNotes,
  voiceNotesUpgradeError,
} from "@/lib/plan-limits";
import { mapVoiceNoteRow } from "@/lib/voice-note-mapper";
import { transcribeVoiceNoteAudio } from "@/lib/voice-note-transcribe";

const VOICE_NOTE_BUCKET = "room-voice-notes";
const MAX_VOICE_NOTE_BYTES = 10 * 1024 * 1024;

async function assertVoiceNotesAllowed(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const planTier = await fetchUserPlanTier(supabase, userId);
  if (!hasVoiceNotes(planTier)) {
    return { ok: false, error: voiceNotesUpgradeError() };
  }
  return { ok: true };
}

async function assertRoomMember(
  supabase: Awaited<ReturnType<typeof createClient>>,
  roomId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: membership } = await supabase
    .from("room_members")
    .select("room_id")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (!membership) {
    return { ok: false, error: "You must be a room member to use voice notes." };
  }

  return { ok: true };
}

function publicAudioUrl(supabase: Awaited<ReturnType<typeof createClient>>, storagePath: string) {
  return supabase.storage.from(VOICE_NOTE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export async function getRoomVoiceNotes(roomId: string): Promise<RoomVoiceNote[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const memberCheck = await assertRoomMember(supabase, roomId, user.id);
  if (!memberCheck.ok) return [];

  const { data: rows, error } = await supabase
    .from("room_voice_notes")
    .select(
      "id, room_id, user_id, storage_path, duration_seconds, transcript, is_shared, shared_at, created_at"
    )
    .eq("room_id", roomId)
    .or(`is_shared.eq.true,user_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error || !rows) {
    console.error("getRoomVoiceNotes:", error?.message);
    return [];
  }

  const userIds = [...new Set(rows.map((row) => row.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, username")
    .in("id", userIds);

  const profileById = Object.fromEntries(
    (profiles ?? []).map((profile) => [profile.id, profile])
  );

  return rows.map((row) => {
    const profile = profileById[row.user_id];
    return mapVoiceNoteRow(row, publicAudioUrl(supabase, row.storage_path), {
      displayName: profile?.display_name ?? "Student",
      username: profile?.username ?? "student",
    });
  });
}

export async function uploadRoomVoiceNote(
  roomId: string,
  formData: FormData
): Promise<{ error: string | null; note?: RoomVoiceNote }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const allowed = await assertVoiceNotesAllowed(supabase, user.id);
  if (!allowed.ok) return { error: allowed.error };

  const memberCheck = await assertRoomMember(supabase, roomId, user.id);
  if (!memberCheck.ok) return { error: memberCheck.error };

  const audio = formData.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return { error: "Record or upload a voice note first." };
  }

  if (audio.size > MAX_VOICE_NOTE_BYTES) {
    return { error: "Voice note is too large (max 10 MB)." };
  }

  const shareWithRoom = formData.get("share") === "on" || formData.get("share") === "true";
  const durationRaw = formData.get("duration_seconds");
  const durationSeconds =
    typeof durationRaw === "string" && durationRaw.trim()
      ? Number.parseFloat(durationRaw)
      : null;

  const ext = audio.type.includes("ogg")
    ? "ogg"
    : audio.type.includes("mp4")
      ? "m4a"
      : "webm";
  const storagePath = `${user.id}/${roomId}/${crypto.randomUUID()}.${ext}`;

  const buffer = Buffer.from(await audio.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(VOICE_NOTE_BUCKET)
    .upload(storagePath, buffer, {
      contentType: audio.type || "audio/webm",
      upsert: false,
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  let transcript: string | null = null;
  const shouldTranscribe =
    formData.get("transcribe") === "on" || formData.get("transcribe") === "true";
  if (shouldTranscribe) {
    const transcription = await transcribeVoiceNoteAudio(audio, `voice-note.${ext}`);
    transcript = transcription.transcript;
  }

  const now = new Date().toISOString();
  const { data: inserted, error: insertError } = await supabase
    .from("room_voice_notes")
    .insert({
      room_id: roomId,
      user_id: user.id,
      storage_path: storagePath,
      duration_seconds: Number.isFinite(durationSeconds ?? NaN) ? durationSeconds : null,
      transcript,
      is_shared: shareWithRoom,
      shared_at: shareWithRoom ? now : null,
    })
    .select("*")
    .single();

  if (insertError || !inserted) {
    await supabase.storage.from(VOICE_NOTE_BUCKET).remove([storagePath]);
    return { error: insertError?.message ?? "Could not save voice note." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, username")
    .eq("id", user.id)
    .single();

  revalidatePath(`/rooms/${roomId}`);

  return {
    error: null,
    note: mapVoiceNoteRow(inserted, publicAudioUrl(supabase, storagePath), {
      displayName: profile?.display_name ?? "Student",
      username: profile?.username ?? "student",
    }),
  };
}

export async function shareRoomVoiceNote(
  noteId: string,
  roomId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const allowed = await assertVoiceNotesAllowed(supabase, user.id);
  if (!allowed.ok) return { error: allowed.error };

  const now = new Date().toISOString();
  const { error } = await supabase
    .from("room_voice_notes")
    .update({ is_shared: true, shared_at: now })
    .eq("id", noteId)
    .eq("room_id", roomId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  revalidatePath(`/rooms/${roomId}`);
  return { error: null };
}

export async function transcribeRoomVoiceNote(
  noteId: string,
  roomId: string
): Promise<{ error: string | null; transcript?: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const allowed = await assertVoiceNotesAllowed(supabase, user.id);
  if (!allowed.ok) return { error: allowed.error };

  const { data: note, error: fetchError } = await supabase
    .from("room_voice_notes")
    .select("id, storage_path, transcript, user_id")
    .eq("id", noteId)
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !note) {
    return { error: "Voice note not found." };
  }

  if (note.transcript) {
    return { error: null, transcript: note.transcript };
  }

  const { data: file, error: downloadError } = await supabase.storage
    .from(VOICE_NOTE_BUCKET)
    .download(note.storage_path);

  if (downloadError || !file) {
    return { error: "Could not load the recording for transcription." };
  }

  const transcription = await transcribeVoiceNoteAudio(file, "voice-note.webm");
  if (transcription.error && !transcription.transcript) {
    return { error: transcription.error };
  }

  const { error: updateError } = await supabase
    .from("room_voice_notes")
    .update({ transcript: transcription.transcript })
    .eq("id", noteId);

  if (updateError) return { error: updateError.message };

  revalidatePath(`/rooms/${roomId}`);
  return { error: null, transcript: transcription.transcript };
}

export async function deleteRoomVoiceNote(
  noteId: string,
  roomId: string
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated." };

  const { data: note, error: fetchError } = await supabase
    .from("room_voice_notes")
    .select("storage_path")
    .eq("id", noteId)
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError || !note) {
    return { error: "Voice note not found." };
  }

  const { error: deleteError } = await supabase
    .from("room_voice_notes")
    .delete()
    .eq("id", noteId);

  if (deleteError) return { error: deleteError.message };

  await supabase.storage.from(VOICE_NOTE_BUCKET).remove([note.storage_path]);
  revalidatePath(`/rooms/${roomId}`);
  return { error: null };
}
