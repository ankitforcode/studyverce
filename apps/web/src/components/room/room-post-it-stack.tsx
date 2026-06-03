"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserPostItTask } from "@studyverce/shared";
import { PostItCanvas } from "@/components/dashboard/post-it-canvas";
import { fetchPostItsForRoom } from "@/lib/post-it-client";
import { mergeFetchedPostItTasks } from "@/lib/post-it-merge";
import { RoomPostItToolbar } from "@/components/room/room-post-it-toolbar";

interface RoomPostItStackProps {
  roomId: string;
  refreshKey?: number;
  tasks?: UserPostItTask[];
  onTasksChange?: Dispatch<SetStateAction<UserPostItTask[]>>;
}

export function RoomPostItStack({
  roomId,
  refreshKey = 0,
  tasks: controlledTasks,
  onTasksChange,
}: RoomPostItStackProps) {
  const [internalTasks, setInternalTasks] = useState<UserPostItTask[]>([]);
  const [loading, setLoading] = useState(true);

  const tasks = controlledTasks ?? internalTasks;

  function applyTasks(update: SetStateAction<UserPostItTask[]>) {
    if (onTasksChange) {
      onTasksChange(update);
    } else {
      setInternalTasks(update);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const roomTasks = await fetchPostItsForRoom(roomId);
      if (!cancelled) {
        applyTasks((prev) => mergeFetchedPostItTasks(prev, roomTasks));
        setLoading(false);
      }
    }

    load();

    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      load();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [roomId, refreshKey]);

  const openTasks = tasks.filter((t) => !t.closed);

  function handleCanvasUpdate(task: UserPostItTask) {
    applyTasks((prev) =>
      prev.map((t) => (t.id === task.id ? task : t))
    );
  }

  function handleCanvasDelete(taskId: string) {
    applyTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  function handleCanvasFocus(taskId: string): number {
    const maxZ = Math.max(...openTasks.map((t) => t.zIndex), 0);
    const nextZ = maxZ + 1;
    applyTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, zIndex: nextZ } : t))
    );
    return nextZ;
  }

  return (
    <>
      <div className="pointer-events-none absolute inset-0 z-20 overflow-visible p-6 pb-20">
        <PostItCanvas
          tasks={openTasks}
          loading={loading}
          onTaskUpdate={handleCanvasUpdate}
          onTaskDelete={handleCanvasDelete}
          onTaskFocus={handleCanvasFocus}
          className="h-full min-h-0 border-0 bg-transparent p-0"
          minHeight={0}
          hideEmpty
          passThroughBackground
        />
      </div>
      <RoomPostItToolbar
        roomId={roomId}
        noteCount={openTasks.length}
        onCreated={() => {
          fetchPostItsForRoom(roomId).then((roomTasks) => {
            applyTasks((prev) => mergeFetchedPostItTasks(prev, roomTasks));
          });
        }}
      />
    </>
  );
}
