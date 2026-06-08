import type { RoomVoiceNote } from "@studyverce/shared";
import type { Database } from "@/lib/supabase/database.types";

type VoiceNoteRow = Database["public"]["Tables"]["room_voice_notes"]["Row"];

export function mapVoiceNoteRow(
  row: VoiceNoteRow,
  audioUrl: string,
  author?: { displayName: string; username: string }
): RoomVoiceNote {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    audioUrl,
    durationSeconds: row.duration_seconds,
    transcript: row.transcript,
    isShared: row.is_shared,
    sharedAt: row.shared_at,
    createdAt: row.created_at,
    authorDisplayName: author?.displayName,
    authorUsername: author?.username,
  };
}
