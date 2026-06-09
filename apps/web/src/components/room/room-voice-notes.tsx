"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import {
  FileText,
  MicOff,
  Share2,
  Square,
  Trash2,
} from "lucide-react";
import type { RoomVoiceNote } from "@studyverce/shared";
import {
  deleteRoomVoiceNote,
  getRoomVoiceNotes,
  shareRoomVoiceNote,
  transcribeRoomVoiceNote,
} from "@/app/rooms/voice-note-actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface RoomVoiceNotesHandle {
  addNote: (note: RoomVoiceNote) => void;
  reloadNotes: () => Promise<void>;
}

interface RoomVoiceNotesProps {
  roomId: string;
  currentUserId: string;
  voiceNotesEnabled: boolean;
  className?: string;
  recording?: boolean;
  recordSeconds?: number;
  pending?: boolean;
  error?: string | null;
  onStopRecording?: (share: boolean) => void;
}

export const RoomVoiceNotes = forwardRef<RoomVoiceNotesHandle, RoomVoiceNotesProps>(
  function RoomVoiceNotes(
    {
      roomId,
      currentUserId,
      voiceNotesEnabled,
      className,
      recording = false,
      recordSeconds = 0,
      pending = false,
      error = null,
      onStopRecording,
    },
    ref
  ) {
    const [notes, setNotes] = useState<RoomVoiceNote[]>([]);
    const [loading, setLoading] = useState(true);
    const [localError, setLocalError] = useState<string | null>(null);
    const [actionPending, startTransition] = useTransition();

    const displayError = error ?? localError;
    const isPending = pending || actionPending;

    const loadNotes = useCallback(async () => {
      setLoading(true);
      const data = await getRoomVoiceNotes(roomId);
      setNotes(data);
      setLoading(false);
    }, [roomId]);

    useEffect(() => {
      void loadNotes();
    }, [loadNotes]);

    useImperativeHandle(ref, () => ({
      addNote(note: RoomVoiceNote) {
        setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
      },
      reloadNotes: loadNotes,
    }));

    function handleShare(noteId: string) {
      startTransition(async () => {
        const result = await shareRoomVoiceNote(noteId, roomId);
        if (result.error) {
          setLocalError(result.error);
          return;
        }
        setNotes((prev) =>
          prev.map((note) =>
            note.id === noteId
              ? { ...note, isShared: true, sharedAt: new Date().toISOString() }
              : note
          )
        );
      });
    }

    function handleTranscribe(noteId: string) {
      startTransition(async () => {
        const result = await transcribeRoomVoiceNote(noteId, roomId);
        if (result.error) {
          setLocalError(result.error);
          return;
        }
        if (result.transcript) {
          setNotes((prev) =>
            prev.map((note) =>
              note.id === noteId ? { ...note, transcript: result.transcript ?? null } : note
            )
          );
        }
      });
    }

    function handleDelete(noteId: string) {
      startTransition(async () => {
        const result = await deleteRoomVoiceNote(noteId, roomId);
        if (result.error) {
          setLocalError(result.error);
          return;
        }
        setNotes((prev) => prev.filter((note) => note.id !== noteId));
      });
    }

    const sharedNotes = notes.filter((note) => note.isShared);
    const privateNotes = notes.filter((note) => !note.isShared && note.userId === currentUserId);

    return (
      <div className={cn("space-y-3 border-t border-border/50 pt-3", className)}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">Voice notes</p>
            <p className="text-xs text-muted-foreground">
              Record, share with the room, and transcribe study reminders.
            </p>
          </div>
        </div>

        {!voiceNotesEnabled ? (
          <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Voice notes are available on{" "}
            <Link href="/plans" className="font-medium text-primary underline-offset-4 hover:underline">
              Premium
            </Link>
            . Upgrade to record, share with your study group, and generate transcripts.
          </p>
        ) : recording && onStopRecording ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">
              <MicOff className="h-3 w-3" />
              {recordSeconds}s
            </span>
            <Button
              type="button"
              size="sm"
              variant="default"
              className="gap-1.5"
              disabled={isPending}
              onClick={() => onStopRecording(true)}
            >
              <Share2 className="h-3.5 w-3.5" />
              Stop & share
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={isPending}
              onClick={() => onStopRecording(false)}
            >
              <Square className="h-3.5 w-3.5" />
              Stop (private)
            </Button>
          </div>
        ) : null}

        {displayError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {displayError}
          </p>
        )}

        {voiceNotesEnabled && (
          <div className="space-y-3">
            {loading ? (
              <p className="text-xs text-muted-foreground">Loading voice notes…</p>
            ) : sharedNotes.length === 0 && privateNotes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No voice notes yet. Use the mic in chat to record one.
              </p>
            ) : (
              <>
                {sharedNotes.length > 0 && (
                  <VoiceNoteList
                    title="Shared with room"
                    notes={sharedNotes}
                    currentUserId={currentUserId}
                    pending={isPending}
                    onShare={handleShare}
                    onTranscribe={handleTranscribe}
                    onDelete={handleDelete}
                  />
                )}
                {privateNotes.length > 0 && (
                  <VoiceNoteList
                    title="Your private notes"
                    notes={privateNotes}
                    currentUserId={currentUserId}
                    pending={isPending}
                    onShare={handleShare}
                    onTranscribe={handleTranscribe}
                    onDelete={handleDelete}
                  />
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);

function VoiceNoteList({
  title,
  notes,
  currentUserId,
  pending,
  onShare,
  onTranscribe,
  onDelete,
}: {
  title: string;
  notes: RoomVoiceNote[];
  currentUserId: string;
  pending: boolean;
  onShare: (noteId: string) => void;
  onTranscribe: (noteId: string) => void;
  onDelete: (noteId: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="space-y-2">
        {notes.map((note) => {
          const isOwn = note.userId === currentUserId;
          return (
            <li
              key={note.id}
              className="rounded-lg border border-border/60 bg-muted/15 px-3 py-2 text-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {isOwn ? "You" : note.authorDisplayName ?? "Student"}
                  </p>
                  <p className="text-muted-foreground">
                    {note.durationSeconds
                      ? `${Math.round(note.durationSeconds)}s`
                      : "Voice note"}
                  </p>
                </div>
                <audio controls preload="none" src={note.audioUrl} className="h-8 max-w-[180px]" />
              </div>

              {note.transcript ? (
                <p className="mt-2 whitespace-pre-wrap text-foreground/90">{note.transcript}</p>
              ) : isOwn ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-2 h-7 gap-1 px-2 text-xs"
                  disabled={pending}
                  onClick={() => onTranscribe(note.id)}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Transcribe
                </Button>
              ) : null}

              {isOwn && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {!note.isShared && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 gap-1 px-2 text-xs"
                      disabled={pending}
                      onClick={() => onShare(note.id)}
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                    disabled={pending}
                    onClick={() => onDelete(note.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
