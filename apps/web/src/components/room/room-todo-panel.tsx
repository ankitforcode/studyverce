"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, ListTodo, RotateCcw } from "lucide-react";
import type { UserPostItTask } from "@studyverce/shared";
import { cn } from "@/lib/utils";
import { POST_IT_BG } from "@/lib/post-it-utils";
import {
  closePostItTask,
  reopenPostItTask,
} from "@/app/dashboard/task-actions";

interface RoomTodoPanelProps {
  tasks: UserPostItTask[];
  onTasksChange: (tasks: UserPostItTask[]) => void;
  className?: string;
}

export function RoomTodoPanel({
  tasks,
  onTasksChange,
  className,
}: RoomTodoPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [pending, startTransition] = useTransition();

  const openTasks = tasks.filter((t) => !t.closed);
  const closedTasks = tasks.filter((t) => t.closed);

  function mergeTask(updated: UserPostItTask) {
    onTasksChange(tasks.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleClose(taskId: string) {
    startTransition(async () => {
      const { task: updated } = await closePostItTask(taskId);
      if (updated) mergeTask(updated);
    });
  }

  function handleReopen(taskId: string) {
    startTransition(async () => {
      const { task: updated } = await reopenPostItTask(taskId);
      if (updated) mergeTask(updated);
    });
  }

  const totalItems = tasks.reduce(
    (sum, task) => sum + 1 + task.items.length,
    0
  );

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col border-b border-border/50",
        collapsed ? "min-h-0" : "max-h-[45%] min-h-[140px]",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/40"
        aria-expanded={!collapsed}
      >
        <div className="flex min-w-0 items-center gap-2">
          <ListTodo className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">My tasks</p>
            <p className="truncate text-xs text-muted-foreground">
              {openTasks.length} open · {closedTasks.length} done
            </p>
          </div>
        </div>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {!collapsed && (
        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {totalItems === 0 ? (
            <p className="px-1 py-4 text-center text-xs text-muted-foreground">
              Add a post-it to track what you&apos;re working on.
            </p>
          ) : (
            <div className="space-y-4">
              {openTasks.length > 0 && (
                <section>
                  <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Open
                  </p>
                  <ul className="space-y-2">
                    {openTasks.map((task) => (
                      <TodoNoteCard
                        key={task.id}
                        task={task}
                        pending={pending}
                        onClose={() => handleClose(task.id)}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {closedTasks.length > 0 && (
                <section>
                  <p className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Completed
                  </p>
                  <ul className="space-y-2">
                    {closedTasks.map((task) => (
                      <TodoNoteCard
                        key={task.id}
                        task={task}
                        pending={pending}
                        closed
                        onReopen={() => handleReopen(task.id)}
                      />
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TodoNoteCard({
  task,
  closed = false,
  pending,
  onClose,
  onReopen,
}: {
  task: UserPostItTask;
  closed?: boolean;
  pending: boolean;
  onClose?: () => void;
  onReopen?: () => void;
}) {
  const done = closed || task.titleDone;

  const content = (
    <div className="flex items-start gap-2">
      <span
        className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border border-black/10"
        style={{ backgroundColor: POST_IT_BG[task.color] }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium leading-snug",
            done && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </p>
        {task.items.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {task.items.map((item) => (
              <li
                key={item.id}
                className={cn(
                  "flex items-start gap-1.5 text-xs leading-snug text-muted-foreground",
                  (closed || item.done) && "line-through opacity-80"
                )}
              >
                <span className="shrink-0">•</span>
                <span className="min-w-0 flex-1">{item.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  if (closed) {
    return (
      <li
        className={cn(
          "rounded-lg border border-border/60 bg-background/60 p-2.5 transition-colors",
          "cursor-pointer hover:border-primary/30 hover:bg-muted/30",
          pending && "opacity-70"
        )}
      >
        <button
          type="button"
          disabled={pending}
          onClick={onReopen}
          className="w-full text-left"
        >
          {content}
          <div className="mt-2 flex items-center gap-1 pl-5 text-[11px] text-primary">
            <RotateCcw className="h-3 w-3" />
            Click to restore on board
          </div>
        </button>
      </li>
    );
  }

  return (
    <li
      className={cn(
        "rounded-lg border border-border/60 bg-background/60 p-2.5",
        pending && "opacity-70"
      )}
    >
      {content}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="mt-2 pl-5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Mark done & close
        </button>
      )}
    </li>
  );
}
