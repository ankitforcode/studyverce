"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { Layers, Pin, Plus, Trash2, CircleCheck } from "lucide-react";
import type { PostItItem, UserPostItTask } from "@studyverse/shared";
import { cn } from "@/lib/utils";
import {
  POST_IT_BG,
  POST_IT_COLOR_STYLES,
  POST_IT_FONT_MAX,
  POST_IT_MAX_SIZE,
  POST_IT_MIN_SIZE,
  POST_IT_SHADOW,
  POST_IT_SHADOW_ACTIVE,
  POST_IT_SHADOW_HOVER,
  POST_IT_SIZE_STEP,
} from "@/lib/post-it-utils";
import { usePostItFitFont } from "@/hooks/use-post-it-fit-font";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import {
  closePostItTask,
  deletePostItTask,
  togglePostItPin,
  updatePostItTask,
} from "@/app/dashboard/task-actions";

interface PostItNoteProps {
  task: UserPostItTask;
  boardRef: React.RefObject<HTMLDivElement | null>;
  onUpdate: (task: UserPostItTask) => void;
  onDelete: (taskId: string) => void;
  onFocus: (taskId: string) => number;
}

type ResizeEdge = "corner" | "right" | "bottom";

function newItem(text = ""): PostItItem {
  return { id: crypto.randomUUID(), text, done: false };
}

function clampSizeSmooth(raw: number) {
  return Math.min(POST_IT_MAX_SIZE, Math.max(POST_IT_MIN_SIZE, raw));
}

function snapSize(raw: number) {
  const stepped =
    Math.round(raw / POST_IT_SIZE_STEP) * POST_IT_SIZE_STEP || POST_IT_MIN_SIZE;
  return clampSizeSmooth(stepped);
}

export function PostItNote({
  task,
  boardRef,
  onUpdate,
  onDelete,
  onFocus,
}: PostItNoteProps) {
  const noteRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const livePosRef = useRef({ x: task.posX, y: task.posY });
  const liveSizeRef = useRef(task.width);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const resizeRef = useRef<{
    startX: number;
    startY: number;
    originSize: number;
    edge: ResizeEdge;
  } | null>(null);
  const interactingRef = useRef(false);

  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftItems, setDraftItems] = useState<PostItItem[]>(task.items);
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [displaySize, setDisplaySize] = useState(task.width);

  const syncNoteGeometry = useCallback(() => {
    const el = noteRef.current;
    if (!el) return;
    el.style.left = `${livePosRef.current.x}px`;
    el.style.top = `${livePosRef.current.y}px`;
    el.style.width = `${liveSizeRef.current}px`;
    el.style.height = `${liveSizeRef.current}px`;
  }, []);

  useLayoutEffect(() => {
    if (interactingRef.current) return;
    livePosRef.current = { x: task.posX, y: task.posY };
    liveSizeRef.current = task.width;
    setDisplaySize(task.width);
    syncNoteGeometry();
  }, [task.posX, task.posY, task.width, syncNoteGeometry]);

  useLayoutEffect(() => {
    if (noteRef.current) {
      noteRef.current.style.zIndex = String(task.zIndex);
    }
  }, [task.zIndex]);

  const focusSelf = useCallback(() => {
    const nextZ = onFocus(task.id);
    if (noteRef.current) {
      noteRef.current.style.zIndex = String(nextZ);
    }
    return nextZ;
  }, [onFocus, task.id]);

  useEffect(() => {
    if (!editing) {
      setDraftTitle(task.title);
      setDraftItems(task.items);
    }
  }, [task.title, task.items, editing]);

  const fitKey = `${task.title}|${task.items.map((i) => i.text).join("|")}|${displaySize}`;
  const fontSize = usePostItFitFont(contentRef, [fitKey], {
    enabled: !editing && !resizing,
  });

  const persistPosition = useCallback(
    (x: number, y: number) => {
      if (task.pinned) return;
      startTransition(async () => {
        const { task: updated, error } = await updatePostItTask(task.id, {
          posX: x,
          posY: y,
        });
        if (updated) onUpdate(updated);
        if (error) {
          livePosRef.current = { x: task.posX, y: task.posY };
          syncNoteGeometry();
        }
      });
    },
    [task.id, task.pinned, task.posX, task.posY, onUpdate, syncNoteGeometry]
  );

  const persistSize = useCallback(
    (size: number) => {
      startTransition(async () => {
        const { task: updated, error } = await updatePostItTask(task.id, {
          width: size,
          height: size,
        });
        if (updated) onUpdate(updated);
        if (error) {
          liveSizeRef.current = task.width;
          setDisplaySize(task.width);
          syncNoteGeometry();
        }
      });
    },
    [task.id, task.width, onUpdate, syncNoteGeometry]
  );

  function clampPosition(x: number, y: number) {
    const board = boardRef.current;
    const note = noteRef.current;
    if (!board || !note) return { x, y };

    const maxX = Math.max(0, board.clientWidth - note.offsetWidth - 8);
    const maxY = Math.max(0, board.clientHeight - note.offsetHeight - 8);
    return {
      x: Math.min(Math.max(8, x), maxX),
      y: Math.min(Math.max(8, y), maxY),
    };
  }

  function sizeDelta(dx: number, dy: number, edge: ResizeEdge) {
    if (edge === "corner") return Math.max(dx, dy);
    if (edge === "right") return dx;
    return dy;
  }

  function startDrag(e: React.PointerEvent) {
    if (editing || task.pinned || resizing) return;
    const target = e.target as HTMLElement;
    if (
      target.closest(
        "button, input, textarea, [data-no-drag], [data-resize-handle]"
      )
    ) {
      return;
    }
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    interactingRef.current = true;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: livePosRef.current.x,
      originY: livePosRef.current.y,
    };
    setDragging(true);
  }

  function startResize(e: React.PointerEvent, edge: ResizeEdge) {
    if (editing || task.pinned) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    focusSelf();
    interactingRef.current = true;
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originSize: liveSizeRef.current,
      edge,
    };
    setResizing(true);
  }

  useEffect(() => {
    if (!dragging && !resizing) return;

    function onPointerMove(e: PointerEvent) {
      if (resizeRef.current) {
        const { startX, startY, originSize, edge } = resizeRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        liveSizeRef.current = clampSizeSmooth(
          originSize + sizeDelta(dx, dy, edge)
        );
        syncNoteGeometry();
        return;
      }

      if (!dragRef.current || task.pinned) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      livePosRef.current = clampPosition(
        dragRef.current.originX + dx,
        dragRef.current.originY + dy
      );
      syncNoteGeometry();
    }

    function onPointerUp(e: PointerEvent) {
      if (resizeRef.current) {
        const { startX, startY, originSize, edge } = resizeRef.current;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const next = snapSize(
          clampSizeSmooth(originSize + sizeDelta(dx, dy, edge))
        );
        liveSizeRef.current = next;
        syncNoteGeometry();
        setDisplaySize(next);
        resizeRef.current = null;
        interactingRef.current = false;
        setResizing(false);
        if (next !== task.width) persistSize(next);
        return;
      }

      if (dragRef.current && !task.pinned) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const next = clampPosition(
          dragRef.current.originX + dx,
          dragRef.current.originY + dy
        );
        livePosRef.current = next;
        syncNoteGeometry();
        dragRef.current = null;
        interactingRef.current = false;
        setDragging(false);
        persistPosition(next.x, next.y);
      }
    }

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerUp);

    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };
  }, [
    dragging,
    resizing,
    task.pinned,
    task.width,
    persistPosition,
    persistSize,
    syncNoteGeometry,
  ]);

  const saveEdits = useCallback(() => {
    const title = draftTitle.trim() || "New note";
    const items = draftItems
      .map((item) => ({ ...item, text: item.text.trim() }))
      .filter((item) => item.text.length > 0);

    setDraftTitle(title);
    setDraftItems(items);
    setEditing(false);

    const titleChanged = title !== task.title;
    const itemsChanged =
      JSON.stringify(items) !== JSON.stringify(task.items);

    if (!titleChanged && !itemsChanged) return;

    startTransition(async () => {
      const { task: updated } = await updatePostItTask(task.id, {
        title,
        items,
      });
      if (updated) onUpdate(updated);
    });
  }, [draftTitle, draftItems, task.id, task.title, task.items, onUpdate]);

  function cancelEdits() {
    setDraftTitle(task.title);
    setDraftItems(task.items);
    setEditing(false);
  }

  function enterEditMode(focusNewItem = false) {
    setDraftTitle(task.title);
    if (focusNewItem) {
      const withNew = [...task.items, newItem()];
      setDraftItems(withNew);
      setEditing(true);
      requestAnimationFrame(() => {
        const inputs = noteRef.current?.querySelectorAll<HTMLInputElement>(
          "[data-item-input]"
        );
        inputs?.[inputs.length - 1]?.focus();
      });
    } else {
      setDraftItems(task.items);
      setEditing(true);
      requestAnimationFrame(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      });
    }
  }

  useEffect(() => {
    if (!editing) return;

    function handlePointerDown(e: PointerEvent) {
      if (!noteRef.current?.contains(e.target as Node)) {
        saveEdits();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [editing, saveEdits]);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const { error } = await deletePostItTask(task.id);
      if (!error) onDelete(task.id);
    });
  }

  function handleTogglePin(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const { task: updated } = await togglePostItPin(task.id);
      if (updated) onUpdate(updated);
    });
  }

  function handleBringToFront(e: React.MouseEvent) {
    e.stopPropagation();
    const nextZ = focusSelf();
    startTransition(async () => {
      await updatePostItTask(task.id, { zIndex: nextZ });
    });
  }

  function handleClose(e: React.MouseEvent) {
    e.stopPropagation();
    startTransition(async () => {
      const { task: updated } = await closePostItTask(task.id);
      if (updated) onUpdate(updated);
    });
  }

  function updateDraftItem(id: string, text: string) {
    setDraftItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item))
    );
  }

  function removeDraftItem(id: string) {
    setDraftItems((prev) => prev.filter((item) => item.id !== id));
  }

  function addDraftItem() {
    setDraftItems((prev) => [...prev, newItem()]);
    requestAnimationFrame(() => {
      const inputs = noteRef.current?.querySelectorAll<HTMLInputElement>(
        "[data-item-input]"
      );
      inputs?.[inputs.length - 1]?.focus();
    });
  }

  const shadow = dragging || resizing
    ? POST_IT_SHADOW_ACTIVE
    : hovered
      ? POST_IT_SHADOW_HOVER
      : POST_IT_SHADOW;

  const iconBtn =
    "pointer-events-auto rounded p-1 text-[#323338]/45 transition-colors hover:bg-black/8 hover:text-[#323338]";

  const showResize = !editing && !task.pinned;
  const showControls =
    (task.pinned || hovered || editing || resizing) && !dragging;
  const showResizeRing = showResize && showControls;

  return (
    <div
      ref={noteRef}
      className={cn(
        "group absolute pointer-events-auto outline-none select-none",
        !editing && !task.pinned && !resizing && "cursor-grab active:cursor-grabbing",
        task.pinned && "cursor-default",
        POST_IT_COLOR_STYLES[task.color],
        pending && "opacity-90"
      )}
      style={{
        left: task.posX,
        top: task.posY,
        zIndex: task.zIndex,
        width: task.width,
        height: task.height,
        borderRadius: 4,
        backgroundColor: POST_IT_BG[task.color],
        boxShadow: shadow,
        transition:
          dragging || resizing ? "none" : "box-shadow 0.15s ease",
        willChange: dragging || resizing ? "left, top, width, height" : undefined,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (!editing && !resizing) enterEditMode();
      }}
      onPointerDown={(e) => {
        e.stopPropagation();
        const target = e.target as HTMLElement;
        if (
          target.closest(
            "button, input, textarea, [data-no-drag], [data-resize-handle]"
          )
        ) {
          return;
        }
        focusSelf();
        startDrag(e);
      }}
    >
      <div className="relative h-full w-full overflow-visible rounded-[4px]">
        {showResizeRing && (
          <div
            className="pointer-events-none absolute inset-0 rounded-[4px] ring-2 ring-[#323338]/20 ring-inset"
            aria-hidden
          />
        )}

        <div
          className={cn(
            "pointer-events-auto absolute right-1 top-1 z-20 flex items-center gap-0.5 transition-opacity",
            showControls ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <PostItIconTooltip label={task.pinned ? "Unpin" : "Pin in place"}>
            <button
              type="button"
              onClick={handleTogglePin}
              className={cn(
                iconBtn,
                task.pinned && "bg-black/10 text-[#323338] opacity-100"
              )}
              aria-label={task.pinned ? "Unpin note" : "Pin note"}
            >
              <Pin
                className={cn("h-3.5 w-3.5", task.pinned && "fill-current")}
              />
            </button>
          </PostItIconTooltip>
          <PostItIconTooltip label="Bring to front">
            <button
              type="button"
              onClick={handleBringToFront}
              className={iconBtn}
              aria-label="Bring to front"
            >
              <Layers className="h-3.5 w-3.5" />
            </button>
          </PostItIconTooltip>
          <PostItIconTooltip label="Mark done & close">
            <button
              type="button"
              onClick={handleClose}
              className={iconBtn}
              aria-label="Mark done and close"
            >
              <CircleCheck className="h-3.5 w-3.5" />
            </button>
          </PostItIconTooltip>
          <PostItIconTooltip label="Delete">
            <button
              type="button"
              onClick={handleDelete}
              className={iconBtn}
              aria-label="Delete note"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </PostItIconTooltip>
        </div>

        {task.pinned && (
          <Pin
            className="pointer-events-none absolute left-1.5 top-1.5 z-10 h-3 w-3 fill-[#323338]/35 text-[#323338]/35"
            aria-hidden
          />
        )}

        <div
          ref={contentRef}
          className={cn(
            "flex h-full flex-col overflow-hidden px-3 pb-8 pt-7 text-[#323338]",
            editing ? "pointer-events-auto overflow-y-auto" : "pointer-events-none"
          )}
          style={{
            fontSize: editing ? POST_IT_FONT_MAX : fontSize,
          }}
        >
          {editing ? (
            <>
              <input
                ref={titleInputRef}
                data-no-drag
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addDraftItem();
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    cancelEdits();
                  }
                }}
                maxLength={120}
                placeholder="Title"
                className="mb-1.5 w-full border-0 bg-transparent font-semibold leading-snug outline-none placeholder:text-[#323338]/40"
              />
              <ul className="min-h-0 flex-1 space-y-0.5">
                {draftItems.map((item) => (
                  <li key={item.id} className="flex items-start gap-1.5">
                    <span className="mt-[0.35em] shrink-0 text-[0.85em] leading-none">
                      •
                    </span>
                    <input
                      data-item-input
                      data-no-drag
                      value={item.text}
                      onChange={(e) => updateDraftItem(item.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addDraftItem();
                        }
                        if (
                          e.key === "Backspace" &&
                          item.text === "" &&
                          draftItems.length > 0
                        ) {
                          e.preventDefault();
                          removeDraftItem(item.id);
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelEdits();
                        }
                      }}
                      maxLength={200}
                      placeholder="List item"
                      className="min-w-0 flex-1 border-0 bg-transparent leading-snug outline-none placeholder:text-[#323338]/40"
                    />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                data-no-drag
                onClick={addDraftItem}
                className="mt-1.5 flex items-center gap-1 self-start text-[0.9em] text-[#323338]/55 hover:text-[#323338]"
              >
                <Plus className="h-3 w-3" />
                Add item
              </button>
            </>
          ) : (
            <>
              <p
                className={cn(
                  "mb-1.5 shrink-0 font-semibold leading-snug",
                  task.titleDone && "text-[#323338]/55 line-through"
                )}
              >
                {task.title}
              </p>
              {task.items.length > 0 && (
                <ul className="min-h-0 flex-1 space-y-0.5 leading-snug">
                  {task.items.map((item) => (
                    <li key={item.id} className="flex items-start gap-1.5">
                      <span className="mt-[0.35em] shrink-0 text-[0.85em] leading-none">
                        •
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 wrap-break-word",
                          item.done && "text-[#323338]/55 line-through"
                        )}
                      >
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {!editing && (
          <PostItIconTooltip label="Add item" side="top">
            <button
              type="button"
              data-no-drag
              onClick={(e) => {
                e.stopPropagation();
                enterEditMode(true);
              }}
              className={cn(
                "pointer-events-auto absolute bottom-7 left-3 z-10 flex items-center gap-0.5 text-[11px] text-[#323338]/50 transition-opacity hover:text-[#323338]",
                showControls ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
            >
              <Plus className="h-3 w-3" />
              Add item
            </button>
          </PostItIconTooltip>
        )}
      </div>

      {showResize && (
        <>
          <PostItIconTooltip
            label="Drag to resize"
            side="top"
            className="absolute bottom-2 right-0 top-2 z-30"
          >
            <div
              data-resize-handle
              aria-label="Resize from right edge"
              onPointerDown={(e) => startResize(e, "right")}
              className={cn(
                "h-full w-2 cursor-e-resize touch-none transition-opacity",
                showControls
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
              )}
            />
          </PostItIconTooltip>
          <PostItIconTooltip
            label="Drag to resize"
            side="top"
            className="absolute bottom-0 left-2 right-2 z-30"
          >
            <div
              data-resize-handle
              aria-label="Resize from bottom edge"
              onPointerDown={(e) => startResize(e, "bottom")}
              className={cn(
                "h-2 w-full cursor-s-resize touch-none transition-opacity",
                showControls
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
              )}
            />
          </PostItIconTooltip>
          <PostItIconTooltip
            label="Drag to resize"
            side="top"
            className="absolute bottom-0 right-0 z-40"
          >
            <div
              data-resize-handle
              aria-label="Resize from corner"
              onPointerDown={(e) => startResize(e, "corner")}
              className={cn(
                "flex h-4 w-4 cursor-se-resize touch-none items-end justify-end p-0.5 transition-opacity",
                showControls
                  ? "pointer-events-auto opacity-100"
                  : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
              )}
            >
              <svg
                viewBox="0 0 12 12"
                className="h-3 w-3 text-[#323338]/45"
                aria-hidden
              >
                <path
                  d="M12 12H8V11H11V8H12V12ZM12 6H11V8H8V11H6V12H12V6Z"
                  fill="currentColor"
                />
                <path
                  d="M12 0V5H11V1H7V0H12ZM5 0V1H1V5H0V0H5Z"
                  fill="currentColor"
                  opacity="0.6"
                />
              </svg>
            </div>
          </PostItIconTooltip>
        </>
      )}
    </div>
  );
}
