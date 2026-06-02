"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { StickyNote, X } from "lucide-react";
import { POST_IT_COLORS, type PostItColor } from "@studyverse/shared";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  POST_IT_BG,
  POST_IT_COLOR_LABELS,
  POST_IT_SHADOW,
  POST_IT_SIZE,
} from "@/lib/post-it-utils";
import { createPostItTask } from "@/app/dashboard/task-actions";

interface RoomTaskPromptProps {
  roomId: string;
  roomName: string;
  hasRoomTasks: boolean;
  onTaskChange?: () => void;
}

function skipKey(roomId: string) {
  return `studyverse-skip-room-task-${roomId}`;
}

export function RoomTaskPrompt({
  roomId,
  roomName,
  hasRoomTasks,
  onTaskChange,
}: RoomTaskPromptProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState("");
  const [color, setColor] = useState<PostItColor>("sky");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (hasRoomTasks) return;
    if (sessionStorage.getItem(skipKey(roomId))) return;
    setOpen(true);
  }, [roomId, hasRoomTasks]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleDismiss() {
    sessionStorage.setItem(skipKey(roomId), "1");
    setOpen(false);
  }

  function handleCreate() {
    const taskTitle = title.trim() || "New note";

    startTransition(async () => {
      const { error } = await createPostItTask({
        title: taskTitle,
        roomId,
        color,
        posX: 40,
        posY: 40,
      });

      if (!error) {
        onTaskChange?.();
        sessionStorage.removeItem(skipKey(roomId));
        setOpen(false);
      }
    });
  }

  if (!mounted || !open || hasRoomTasks) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
        role="dialog"
        aria-labelledby="room-task-title"
        aria-modal="true"
      >
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15">
              <StickyNote className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 id="room-task-title" className="text-lg font-semibold">
                Set your focus for this session
              </h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                What will you work on in {roomName}?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="flex justify-center">
            <div
              className="flex items-center justify-center p-4 text-center text-[15px] text-[#323338]"
              style={{
                width: POST_IT_SIZE,
                height: POST_IT_SIZE,
                backgroundColor: POST_IT_BG[color],
                borderRadius: 4,
                boxShadow: POST_IT_SHADOW,
              }}
            >
              {title.trim() || "Your note preview"}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room-task-name">Title</Label>
            <Input
              id="room-task-name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Finish chapter 1"
              maxLength={120}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {POST_IT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={POST_IT_COLOR_LABELS[c]}
                  aria-label={POST_IT_COLOR_LABELS[c]}
                  onClick={() => setColor(c)}
                  className={cn(
                    "h-8 w-8 rounded-full border-2 transition-transform hover:scale-105",
                    color === c ? "border-foreground/70 scale-105" : "border-black/10"
                  )}
                  style={{ backgroundColor: POST_IT_BG[c] }}
                />
              ))}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Double-click a post-it to edit the title and bullet items. Drag the
            edges or corner to resize.
          </p>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="ghost" onClick={handleDismiss}>
            Skip for now
          </Button>
          <Button type="button" onClick={handleCreate} disabled={pending}>
            Add post-it
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
