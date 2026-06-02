"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { POST_IT_COLORS, type PostItColor } from "@studyverse/shared";
import { cn } from "@/lib/utils";
import {
  POST_IT_BG,
  POST_IT_COLOR_LABELS,
  POST_IT_SIZE,
} from "@/lib/post-it-utils";
import { createPostItTask } from "@/app/dashboard/task-actions";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";

interface RoomPostItToolbarProps {
  roomId: string;
  noteCount: number;
  onCreated: () => void;
}

export function RoomPostItToolbar({
  roomId,
  noteCount,
  onCreated,
}: RoomPostItToolbarProps) {
  const [selectedColor, setSelectedColor] = useState<PostItColor>("yellow");
  const [pending, startTransition] = useTransition();

  function handleAdd() {
    startTransition(async () => {
      const col = noteCount % 3;
      const row = Math.floor(noteCount / 3);
      const { error } = await createPostItTask({
        title: "New note",
        roomId,
        color: selectedColor,
        posX: 24 + col * (POST_IT_SIZE + 16),
        posY: 24 + row * (POST_IT_SIZE + 16),
      });
      if (!error) onCreated();
    });
  }

  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 z-30 flex justify-center p-3 sm:p-4">
      <div
        className={cn(
          "flex flex-wrap items-center gap-3 rounded-xl border border-border/50 px-4 py-2.5",
          "bg-card/90 shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-card/80"
        )}
      >
        <span className="text-xs font-medium text-muted-foreground">Add post-it</span>

        <div className="flex items-center gap-2">
          {POST_IT_COLORS.map((color) => (
            <PostItIconTooltip
              key={color}
              label={POST_IT_COLOR_LABELS[color]}
              side="bottom"
            >
              <button
                type="button"
                aria-label={POST_IT_COLOR_LABELS[color]}
                onClick={() => setSelectedColor(color)}
                className={cn(
                  "h-7 w-7 rounded-full border-2 transition-transform hover:scale-105",
                  selectedColor === color
                    ? "border-foreground/70 scale-105"
                    : "border-black/10"
                )}
                style={{ backgroundColor: POST_IT_BG[color] }}
              />
            </PostItIconTooltip>
          ))}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          Add note
        </button>
      </div>
    </div>
  );
}
