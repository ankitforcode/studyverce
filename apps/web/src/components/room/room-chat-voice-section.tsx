"use client";

import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "@studyverce/shared";
import { RoomChat } from "@/components/room/room-chat";
import {
  RoomVoiceNotes,
  type RoomVoiceNotesHandle,
} from "@/components/room/room-voice-notes";
import { useRoomVoiceRecording } from "@/components/room/use-room-voice-recording";

interface RoomChatVoiceSectionProps {
  roomId: string;
  currentUserId: string;
  voiceNotesEnabled: boolean;
  messages: ChatMessage[];
  isModerator: boolean;
  onSend: (content: string) => void;
  onDelete: (messageId: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function RoomChatVoiceSection({
  roomId,
  currentUserId,
  voiceNotesEnabled,
  messages,
  isModerator,
  onSend,
  onDelete,
  collapsed,
  onCollapsedChange,
}: RoomChatVoiceSectionProps) {
  const voiceNotesRef = useRef<RoomVoiceNotesHandle>(null);
  const [error, setError] = useState<string | null>(null);

  const onNoteUploaded = useCallback((note: Parameters<RoomVoiceNotesHandle["addNote"]>[0]) => {
    voiceNotesRef.current?.addNote(note);
  }, []);

  const onReloadNotes = useCallback(async () => {
    await voiceNotesRef.current?.reloadNotes();
  }, []);

  const { recording, recordSeconds, pending, startRecording, stopRecording } =
    useRoomVoiceRecording(
      roomId,
      voiceNotesEnabled,
      onNoteUploaded,
      setError,
      onReloadNotes
    );

  function handleStartRecording() {
    setError(null);
    void startRecording();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <RoomChat
        messages={messages}
        currentUserId={currentUserId}
        isModerator={isModerator}
        onSend={onSend}
        onDelete={onDelete}
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
        className="min-h-0 flex-1"
        voiceNotesEnabled={voiceNotesEnabled}
        voiceRecordPending={pending || recording}
        onStartVoiceRecord={handleStartRecording}
      />
      {!collapsed && (
        <RoomVoiceNotes
          ref={voiceNotesRef}
          roomId={roomId}
          currentUserId={currentUserId}
          voiceNotesEnabled={voiceNotesEnabled}
          recording={recording}
          recordSeconds={recordSeconds}
          pending={pending}
          error={error}
          onStopRecording={stopRecording}
          className="mx-4 mb-4 shrink-0"
        />
      )}
    </div>
  );
}
