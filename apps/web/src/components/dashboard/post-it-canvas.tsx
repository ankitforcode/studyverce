"use client";

import { useRef } from "react";
import { StickyNote } from "lucide-react";
import type { UserPostItTask } from "@studyverse/shared";
import { cn } from "@/lib/utils";
import { PostItNote } from "@/components/dashboard/post-it-note";

interface PostItCanvasProps {
  tasks: UserPostItTask[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  minHeight?: number;
  onTasksChange?: (tasks: UserPostItTask[]) => void;
  onTaskUpdate?: (task: UserPostItTask) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskFocus?: (taskId: string) => number;
  hideEmpty?: boolean;
  /** Let clicks pass through empty board area (for room overlay layout). */
  passThroughBackground?: boolean;
}

export function PostItCanvas({
  tasks,
  loading = false,
  emptyMessage = "No tasks yet.",
  className,
  minHeight = 480,
  onTasksChange,
  onTaskUpdate,
  onTaskDelete,
  onTaskFocus,
  hideEmpty = false,
  passThroughBackground = false,
}: PostItCanvasProps) {
  const boardRef = useRef<HTMLDivElement>(null);

  function handleUpdate(task: UserPostItTask) {
    if (onTaskUpdate) {
      onTaskUpdate(task);
      return;
    }
    onTasksChange?.(tasks.map((t) => (t.id === task.id ? task : t)));
  }

  function handleDelete(taskId: string) {
    if (onTaskDelete) {
      onTaskDelete(taskId);
      return;
    }
    onTasksChange?.(tasks.filter((t) => t.id !== taskId));
  }

  function handleFocus(taskId: string): number {
    if (onTaskFocus) {
      return onTaskFocus(taskId);
    }
    const maxZ = Math.max(...tasks.map((t) => t.zIndex), 0);
    const nextZ = maxZ + 1;
    onTasksChange?.(
      tasks.map((t) =>
        t.id === taskId ? { ...t, zIndex: nextZ } : t
      )
    );
    return nextZ;
  }

  if (hideEmpty && !loading && tasks.length === 0) {
    return null;
  }

  return (
    <div
      ref={boardRef}
      className={cn(
        "relative isolate w-full rounded-xl border border-dashed border-primary/25 bg-gradient-to-br from-muted/40 via-background to-primary/5 p-4",
        minHeight === 0 && "h-full min-h-0",
        passThroughBackground &&
          "pointer-events-none overflow-visible border-0 bg-transparent",
        !passThroughBackground && "overflow-auto",
        className
      )}
      style={minHeight > 0 ? { minHeight } : undefined}
    >
      {loading && tasks.length === 0 ? (
        <div
          className="flex items-center justify-center text-sm text-muted-foreground"
          style={{ minHeight: Math.max(minHeight - 16, 120) }}
        >
          Loading your notes…
        </div>
      ) : tasks.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center gap-2 p-6 text-center"
          style={{ minHeight: Math.max(minHeight - 16, 120) }}
        >
          <StickyNote className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        [...tasks]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((task) => (
          <PostItNote
            key={task.id}
            task={task}
            boardRef={boardRef}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
            onFocus={handleFocus}
          />
        ))
      )}
    </div>
  );
}
