"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { Pin, Trash2, CircleCheck } from "lucide-react";
import type { PostItItem, UserPostItTask } from "@studyverce/shared";
import { cn } from "@/lib/utils";
import {
  POST_IT_BG,
  POST_IT_COLOR_STYLES,
  POST_IT_MAX_SIZE,
  POST_IT_MIN_SIZE,
  POST_IT_RADIUS,
  POST_IT_SHADOW,
  POST_IT_SHADOW_ACTIVE,
  POST_IT_SHADOW_HOVER,
  POST_IT_SIZE_STEP,
} from "@/lib/post-it-utils";
import { usePostItFitFont } from "@/hooks/use-post-it-fit-font";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import { PostItFormatActions } from "@/components/dashboard/post-it-format-toolbar";
import { PostItRichTextField } from "@/components/dashboard/post-it-rich-text-field";
import { PostItRichTextView } from "@/components/dashboard/post-it-rich-text-view";
import {
  applyPostItTextFormat,
  flushPostItEditorsFromNote,
  isPostItHtmlEmpty,
  sanitizePostItHtml,
  stripPostItHtml,
  type PostItTextFormat,
} from "@/lib/post-it-rich-text";
import {
  closePostItTask,
  deletePostItTask,
  togglePostItPin,
  updatePostItTask,
} from "@/app/dashboard/task-actions";

const NO_DRAG_SELECTOR =
  "button, input, textarea, [contenteditable], [data-no-drag], [data-resize-handle]";

/** Background Redis/DB save while still editing. */
const PERSIST_DEBOUNCE_MS = 200;

function postItDraftKey(title: string, items: PostItItem[]): string {
  return JSON.stringify({
    title,
    items: items.map((i) => ({ id: i.id, text: i.text, done: i.done })),
  });
}

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
  const activeEditorRef = useRef<HTMLDivElement | null>(null);
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
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPersistedKeyRef = useRef<string | null>(null);
  const saveInFlightRef = useRef(false);
  const pendingSaveKeyRef = useRef<string | null>(null);
  const pendingSavePayloadRef = useRef<{
    title: string;
    items: PostItItem[];
    immediate?: boolean;
  } | null>(null);

  const [draftTitle, setDraftTitle] = useState(task.title);
  const [draftItems, setDraftItems] = useState<PostItItem[]>(task.items);
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
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

  const bringToFront = useCallback(() => {
    const nextZ = onFocus(task.id);
    if (noteRef.current) {
      noteRef.current.style.zIndex = String(nextZ);
    }
    if (nextZ !== task.zIndex) {
      void updatePostItTask(task.id, { zIndex: nextZ });
    }
    return nextZ;
  }, [onFocus, task.id, task.zIndex]);

  useEffect(() => {
    if (editing) return;
    setDraftTitle(task.title);
    setDraftItems(task.items);
  }, [task.title, task.items, editing]);

  const displayTitle = editing ? draftTitle : task.title;
  const displayItems = editing ? draftItems : task.items;
  const fitKey = `${stripPostItHtml(displayTitle)}|${displayItems.map((i) => stripPostItHtml(i.text)).join("|")}|${displaySize}`;
  const fontSize = usePostItFitFont(contentRef, [fitKey], {
    enabled: !resizing,
  });

  const persistPosition = useCallback(
    (x: number, y: number) => {
      if (task.pinned) return;
      void (async () => {
        const { task: updated, error } = await updatePostItTask(task.id, {
          posX: x,
          posY: y,
        });
        if (updated) onUpdate(updated);
        if (error) {
          livePosRef.current = { x: task.posX, y: task.posY };
          syncNoteGeometry();
        }
      })();
    },
    [task.id, task.pinned, task.posX, task.posY, onUpdate, syncNoteGeometry]
  );

  const persistSize = useCallback(
    (size: number) => {
      void (async () => {
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
      })();
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
    if (target.closest(NO_DRAG_SELECTOR)) {
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
    bringToFront();
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

  const flushDraftFromEditors = useCallback(() => {
    return flushPostItEditorsFromNote(noteRef.current, {
      title: draftTitle,
      items: draftItems,
    });
  }, [draftTitle, draftItems]);

  const buildDraftFromFlush = useCallback(
    (flushed: { title: string; items: PostItItem[] }, filterEmpty: boolean) => {
      const title = sanitizePostItHtml(flushed.title);
      const finalTitle = isPostItHtmlEmpty(title) ? "New note" : title;
      const items = flushed.items
        .map((item) => ({ ...item, text: sanitizePostItHtml(item.text) }))
        .filter((item) => !filterEmpty || !isPostItHtmlEmpty(item.text));
      const nextTask: UserPostItTask = {
        ...task,
        title: finalTitle,
        items,
        updatedAt: new Date().toISOString(),
      };
      return { finalTitle, items, nextTask };
    },
    [task]
  );

  /** Push current editor DOM into room/todo state immediately (no server wait). */
  const syncDraftToParent = useCallback(
    (filterEmpty = false) => {
      const flushed = flushDraftFromEditors();
      const { finalTitle, items, nextTask } = buildDraftFromFlush(
        flushed,
        filterEmpty
      );
      setDraftTitle(finalTitle);
      setDraftItems(items);
      onUpdate(nextTask);
      return { finalTitle, items, nextTask };
    },
    [flushDraftFromEditors, buildDraftFromFlush, onUpdate]
  );

  const runServerSave = useCallback(
    async (
      title: string,
      items: PostItItem[],
      options?: { immediate?: boolean }
    ) => {
      const key = postItDraftKey(title, items);
      if (saveInFlightRef.current) {
        pendingSaveKeyRef.current = key;
        pendingSavePayloadRef.current = { title, items, immediate: options?.immediate };
        return;
      }

      saveInFlightRef.current = true;

      const { task: updated, error } = await updatePostItTask(
        task.id,
        { title, items },
        options?.immediate ? { flush: "immediate" } : undefined
      );

      saveInFlightRef.current = false;

      if (!error) {
        lastPersistedKeyRef.current = key;
        if (updated) {
          const serverKey = postItDraftKey(updated.title, updated.items);
          if (serverKey !== key) {
            onUpdate(updated);
            lastPersistedKeyRef.current = serverKey;
          }
        }
      }

      const pendingKey = pendingSaveKeyRef.current;
      const pendingPayload = pendingSavePayloadRef.current;
      pendingSaveKeyRef.current = null;
      pendingSavePayloadRef.current = null;

      if (pendingPayload && pendingKey && pendingKey !== lastPersistedKeyRef.current) {
        void runServerSave(
          pendingPayload.title,
          pendingPayload.items,
          pendingPayload.immediate ? { immediate: true } : undefined
        );
      }
    },
    [task.id, onUpdate]
  );

  const persistDraft = useCallback(
    async (exitEdit: boolean) => {
      if (!editing) return;

      const flushed = flushDraftFromEditors();
      const { finalTitle, items, nextTask } = buildDraftFromFlush(
        flushed,
        exitEdit
      );
      const key = postItDraftKey(finalTitle, items);

      setDraftTitle(finalTitle);
      setDraftItems(items);
      onUpdate(nextTask);

      if (exitEdit) {
        if (key !== lastPersistedKeyRef.current) {
          await runServerSave(finalTitle, items, { immediate: true });
        }
        flushSync(() => setEditing(false));
        lastPersistedKeyRef.current = null;
        return;
      }

      if (key !== lastPersistedKeyRef.current) {
        void runServerSave(finalTitle, items);
      }
    },
    [editing, flushDraftFromEditors, buildDraftFromFlush, onUpdate, runServerSave]
  );

  const flushPersist = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    persistDraft(false);
  }, [persistDraft]);

  const schedulePersist = useCallback(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      persistDraft(false);
    }, PERSIST_DEBOUNCE_MS);
  }, [persistDraft]);

  useEffect(() => {
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, []);

  const handleTextFormat = useCallback(
    (format: PostItTextFormat) => {
      const el = activeEditorRef.current;
      if (!el) return;
      const html = applyPostItTextFormat(el, format);
      if (el.dataset.field === "title") {
        setDraftTitle(html);
      } else if (el.dataset.itemId) {
        setDraftItems((prev) =>
          prev.map((item) =>
            item.id === el.dataset.itemId ? { ...item, text: html } : item
          )
        );
      }
      requestAnimationFrame(() => {
        syncDraftToParent(false);
        schedulePersist();
      });
    },
    [syncDraftToParent, schedulePersist]
  );

  const saveEdits = useCallback(() => {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    void persistDraft(true);
  }, [persistDraft]);

  function cancelEdits() {
    if (persistTimerRef.current) {
      clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    lastPersistedKeyRef.current = null;
    setDraftTitle(task.title);
    setDraftItems(task.items);
    setEditing(false);
  }

  function enterEditMode() {
    setDraftTitle(task.title);
    setDraftItems(task.items);
    lastPersistedKeyRef.current = postItDraftKey(task.title, task.items);
    setEditing(true);
    requestAnimationFrame(() => {
      const titleEl = noteRef.current?.querySelector<HTMLDivElement>(
        '[data-field="title"]'
      );
      if (titleEl) {
        activeEditorRef.current = titleEl;
        titleEl.focus();
        const range = document.createRange();
        range.selectNodeContents(titleEl);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    });
  }

  useEffect(() => {
    if (!editing) return;

    function handlePointerDown(e: PointerEvent) {
      if (!noteRef.current?.contains(e.target as Node)) {
        const active = document.activeElement;
        if (
          active instanceof HTMLElement &&
          noteRef.current?.contains(active)
        ) {
          active.blur();
        }
        saveEdits();
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [editing, saveEdits]);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    void (async () => {
      const { error } = await deletePostItTask(task.id);
      if (!error) onDelete(task.id);
    })();
  }

  function handleTogglePin(e: React.MouseEvent) {
    e.stopPropagation();
    void (async () => {
      const { task: updated } = await togglePostItPin(task.id);
      if (updated) onUpdate(updated);
    })();
  }

  function handleClose(e: React.MouseEvent) {
    e.stopPropagation();
    void (async () => {
      const { task: updated } = await closePostItTask(task.id);
      if (updated) onUpdate(updated);
    })();
  }

  function updateDraftItem(id: string, text: string) {
    setDraftItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text } : item))
    );
    requestAnimationFrame(() => {
      syncDraftToParent(false);
      schedulePersist();
    });
  }

  function handleTitleChange(html: string) {
    setDraftTitle(html);
    requestAnimationFrame(() => {
      syncDraftToParent(false);
      schedulePersist();
    });
  }

  function handleFieldBlur() {
    flushPersist();
  }

  function removeDraftItem(id: string) {
    setDraftItems((prev) => prev.filter((item) => item.id !== id));
    requestAnimationFrame(() => {
      syncDraftToParent(false);
      schedulePersist();
    });
  }

  function addDraftItem() {
    setDraftItems((prev) => [...prev, newItem()]);
    requestAnimationFrame(() => {
      syncDraftToParent(false);
      schedulePersist();
      const fields = noteRef.current?.querySelectorAll<HTMLDivElement>(
        '[data-field="item"]'
      );
      const last = fields?.[fields.length - 1];
      if (last) {
        activeEditorRef.current = last;
        last.focus();
      }
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

  const noteActions = (
    <>
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
          <Pin className={cn("h-3.5 w-3.5", task.pinned && "fill-current")} />
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
    </>
  );

  return (
    <div
      ref={noteRef}
      className={cn(
        "group absolute pointer-events-auto outline-none select-none",
        !editing && !task.pinned && !resizing && "cursor-grab active:cursor-grabbing",
        task.pinned && "cursor-default",
        POST_IT_COLOR_STYLES[task.color]
      )}
      style={{
        left: task.posX,
        top: task.posY,
        zIndex: task.zIndex,
        width: task.width,
        height: task.height,
        borderRadius: POST_IT_RADIUS,
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
        bringToFront();
        const target = e.target as HTMLElement;
        if (target.closest(NO_DRAG_SELECTOR)) {
          return;
        }
        startDrag(e);
      }}
    >
      <div className="relative flex h-full w-full flex-col overflow-visible">
        <div
          className={cn(
            "pointer-events-auto absolute right-1 top-1 z-20 flex items-center gap-0.5 transition-opacity",
            editing || showControls ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
          data-no-drag
          onPointerDown={(e) => e.stopPropagation()}
        >
          {editing && (
            <PostItFormatActions
              onFormat={handleTextFormat}
              iconBtnClass={iconBtn}
            />
          )}
          {noteActions}
        </div>

        {task.pinned && !editing && (
          <Pin
            className="pointer-events-none absolute left-1.5 top-1.5 z-10 h-3 w-3 fill-[#323338]/35 text-[#323338]/35"
            aria-hidden
          />
        )}

        <div
          ref={contentRef}
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden px-3 text-[#323338] antialiased transition-[font-size,opacity] duration-150 ease-out",
            editing
              ? "pointer-events-auto overflow-y-auto pb-8 pt-7"
              : "pointer-events-none pb-8 pt-7"
          )}
          style={{ fontSize }}
        >
          {editing ? (
            <>
              <PostItRichTextField
                field="title"
                value={draftTitle}
                onChange={handleTitleChange}
                onBlur={handleFieldBlur}
                onFocus={(el) => {
                  activeEditorRef.current = el;
                }}
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
                placeholder="Title"
                className="mb-1.5 w-full font-semibold leading-snug"
              />
              <ul className="min-h-0 flex-1 space-y-0.5">
                {draftItems.map((item) => (
                  <li key={item.id} className="flex items-start gap-1.5">
                    <span className="mt-[0.35em] shrink-0 text-[0.85em] leading-none">
                      •
                    </span>
                    <PostItRichTextField
                      field="item"
                      itemId={item.id}
                      value={item.text}
                      onChange={(html) => updateDraftItem(item.id, html)}
                      onBlur={handleFieldBlur}
                      onFocus={(el) => {
                        activeEditorRef.current = el;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const html = sanitizePostItHtml(
                            (e.currentTarget as HTMLDivElement).innerHTML
                          );
                          updateDraftItem(item.id, html);
                          addDraftItem();
                          schedulePersist();
                        }
                        if (
                          e.key === "Backspace" &&
                          isPostItHtmlEmpty(
                            sanitizePostItHtml(
                              (e.currentTarget as HTMLDivElement).innerHTML
                            )
                          ) &&
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
                      placeholder="List item"
                      className="min-w-0 flex-1 leading-snug"
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="mb-1.5 shrink-0 font-semibold leading-snug wrap-break-word">
                <PostItRichTextView
                  html={displayTitle}
                  lineThrough={task.titleDone}
                />
              </p>
              {displayItems.length > 0 && (
                <ul className="min-h-0 flex-1 space-y-0.5 leading-snug">
                  {displayItems.map((item) => (
                    <li key={item.id} className="flex items-start gap-1.5">
                      <span className="mt-[0.35em] shrink-0 text-[0.85em] leading-none">
                        •
                      </span>
                      <span
                        className={cn(
                          "min-w-0 flex-1 wrap-break-word",
                          item.done && "text-[#323338]/55"
                        )}
                      >
                        <PostItRichTextView
                          html={item.text}
                          lineThrough={item.done}
                        />
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
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
