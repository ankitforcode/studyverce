"use client";

import { useState, useTransition, type Dispatch, type SetStateAction } from "react";
import { ChevronDown, ChevronUp, ListTodo, RotateCcw, Trash2 } from "lucide-react";
import type { UserPostItTask } from "@studyverce/shared";
import { cn } from "@/lib/utils";
import { POST_IT_BG } from "@/lib/post-it-utils";
import { PostItRichTextView } from "@/components/dashboard/post-it-rich-text-view";
import {
  closePostItTask,
  deletePostItTask,
  reopenPostItTask,
} from "@/app/dashboard/task-actions";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";

interface RoomTodoPanelProps {
  tasks: UserPostItTask[];
  onTasksChange: Dispatch<SetStateAction<UserPostItTask[]>>;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

export function RoomTodoPanel({
  tasks,
  onTasksChange,
  collapsed: collapsedProp,
  onCollapsedChange,
  className,
}: RoomTodoPanelProps) {
  const [collapsedInternal, setCollapsedInternal] = useState(true);
  const collapsed = collapsedProp ?? collapsedInternal;

  function toggleCollapsed() {
    const next = !collapsed;
    if (collapsedProp === undefined) {
      setCollapsedInternal(next);
    }
    onCollapsedChange?.(next);
  }
  const [pending, startTransition] = useTransition();

  const openTasks = tasks.filter((t) => !t.closed);
  const closedTasks = tasks.filter((t) => t.closed);

  function mergeTask(updated: UserPostItTask) {
    onTasksChange((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t))
    );
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

  function handleDelete(taskId: string) {
    startTransition(async () => {
      const { error } = await deletePostItTask(taskId);
      if (!error) {
        onTasksChange((prev) => prev.filter((t) => t.id !== taskId));
      }
    });
  }

  const totalItems = tasks.reduce(
    (sum, task) => sum + 1 + task.items.length,
    0
  );

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col border-b border-border/50",
        collapsed ? "shrink-0" : "h-full min-h-0 flex-1 basis-0",
        className
      )}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/25"
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
                        onDelete={() => handleDelete(task.id)}
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
                        onDelete={() => handleDelete(task.id)}
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
  onDelete,
}: {
  task: UserPostItTask;
  closed?: boolean;
  pending: boolean;
  onClose?: () => void;
  onReopen?: () => void;
  onDelete?: () => void;
}) {
  const done = closed || task.titleDone;

  const deleteButton = onDelete ? (
    <PostItIconTooltip label="Delete">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        disabled={pending}
        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted/50 hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
        aria-label="Delete task"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </PostItIconTooltip>
  ) : null;

  const content = (
    <div className="flex items-start gap-2 pr-6">
      <span
        className="mt-0.5 h-3 w-3 shrink-0 rounded-sm border border-black/10"
        style={{ backgroundColor: POST_IT_BG[task.color] }}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm font-medium leading-snug",
            done && "text-muted-foreground"
          )}
        >
          <PostItRichTextView html={task.title} lineThrough={done} />
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
                <span className="min-w-0 flex-1">
                  <PostItRichTextView
                    html={item.text}
                    lineThrough={closed || item.done}
                  />
                </span>
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
          "group relative rounded-lg border border-border/40 bg-card/25 p-2.5 backdrop-blur-sm transition-colors",
          "cursor-pointer hover:border-primary/30 hover:bg-card/35",
          pending && "opacity-70"
        )}
      >
        {deleteButton && (
          <div className="absolute right-2 top-2 z-10">{deleteButton}</div>
        )}
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
        "group relative rounded-lg border border-border/40 bg-card/25 p-2.5 backdrop-blur-sm",
        pending && "opacity-70"
      )}
    >
      {deleteButton && (
        <div className="absolute right-2 top-2 z-10">{deleteButton}</div>
      )}
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
