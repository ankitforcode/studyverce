"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { RoomVoiceNote } from "@studyverce/shared";
import { uploadRoomVoiceNote } from "@/app/rooms/voice-note-actions";

export function useRoomVoiceRecording(
  roomId: string,
  voiceNotesEnabled: boolean,
  onNoteUploaded: (note: RoomVoiceNote) => void,
  onUploadError: (message: string) => void,
  onReloadNotes?: () => void | Promise<void>
) {
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [pending, startTransition] = useTransition();

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const recordSecondsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      mediaRecorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startRecording() {
    if (!voiceNotesEnabled || recording || pending) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setRecordSeconds(0);
      recordSecondsRef.current = 0;
      timerRef.current = window.setInterval(() => {
        recordSecondsRef.current += 1;
        setRecordSeconds(recordSecondsRef.current);
      }, 1000);
    } catch {
      onUploadError("Microphone access is required to record voice notes.");
    }
  }

  function stopRecording(share: boolean) {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    recorder.onstop = () => {
      recorder.stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      chunksRef.current = [];
      setRecording(false);
      setRecordSeconds(0);
      mediaRecorderRef.current = null;

      if (blob.size === 0) {
        onUploadError("Recording was empty. Try again.");
        return;
      }

      startTransition(async () => {
        const formData = new FormData();
        formData.set("audio", blob, "voice-note.webm");
        formData.set("share", share ? "true" : "false");
        formData.set("transcribe", "true");
        formData.set("duration_seconds", String(recordSecondsRef.current));

        const result = await uploadRoomVoiceNote(roomId, formData);
        if (result.error) {
          onUploadError(result.error);
          return;
        }
        if (result.note) {
          onNoteUploaded(result.note);
        } else {
          await onReloadNotes?.();
        }
      });
    };

    recorder.stop();
  }

  return {
    recording,
    recordSeconds,
    pending,
    startRecording,
    stopRecording,
  };
}
