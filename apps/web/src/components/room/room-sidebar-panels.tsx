"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { GripVertical } from "lucide-react";
import type { RoomSidebarPanelId } from "@studyverce/shared";
import { saveRoomSidebarPanelOrder } from "@/app/rooms/sidebar-actions";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import { getSidebarSlotShift } from "@/lib/room-sidebar-drag";
import { reorderSidebarPanels } from "@/lib/room-sidebar";
import { cn } from "@/lib/utils";

export type RoomSidebarPanelRenderers = Record<
  RoomSidebarPanelId,
  ReactNode
>;

export type RoomSidebarPanelExpanded = Record<RoomSidebarPanelId, boolean>;

interface RoomSidebarPanelsProps {
  roomId: string;
  initialOrder: RoomSidebarPanelId[];
  panelExpanded: RoomSidebarPanelExpanded;
  panels: RoomSidebarPanelRenderers;
  className?: string;
}

type DragState = {
  panelId: RoomSidebarPanelId;
  fromIndex: number;
  overIndex: number | null;
  offsetY: number;
  height: number;
};

function getDropIndex(
  clientY: number,
  order: RoomSidebarPanelId[],
  panelRefs: Map<RoomSidebarPanelId, HTMLDivElement | null>
): number {
  const entries = order.map((id, index) => {
    const rect = panelRefs.get(id)?.getBoundingClientRect();
    return {
      index,
      mid: rect ? rect.top + rect.height / 2 : Number.POSITIVE_INFINITY,
    };
  });

  for (const { index, mid } of entries) {
    if (clientY < mid) return index;
  }

  return order.length - 1;
}

export function RoomSidebarPanels({
  roomId,
  initialOrder,
  panelExpanded,
  panels,
  className,
}: RoomSidebarPanelsProps) {
  const [order, setOrder] = useState(initialOrder);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const orderRef = useRef(order);
  const panelRefs = useRef(
    new Map<RoomSidebarPanelId, HTMLDivElement | null>()
  );
  const rafRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragOverIndexRef = useRef<number | null>(null);
  const [, startTransition] = useTransition();

  const expandedCount = order.filter((id) => panelExpanded[id]).length;

  useEffect(() => {
    setOrder(initialOrder);
  }, [initialOrder]);

  useEffect(() => {
    orderRef.current = order;
  }, [order]);

  useEffect(() => {
    if (!dragState) return;
    const prev = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
    return () => {
      document.body.style.userSelect = prev;
      document.body.style.cursor = "";
    };
  }, [dragState]);

  const persistOrder = useCallback(
    (next: RoomSidebarPanelId[]) => {
      startTransition(async () => {
        await saveRoomSidebarPanelOrder(roomId, next);
      });
    },
    [roomId]
  );

  const setPanelRef = useCallback(
    (id: RoomSidebarPanelId) => (el: HTMLDivElement | null) => {
      panelRefs.current.set(id, el);
    },
    []
  );

  function handleGripPointerDown(
    panelId: RoomSidebarPanelId,
    e: React.PointerEvent<HTMLButtonElement>
  ) {
    e.preventDefault();
    e.stopPropagation();

    const fromIndex = orderRef.current.indexOf(panelId);
    if (fromIndex < 0) return;

    const slotEl = panelRefs.current.get(panelId);
    const height = slotEl?.getBoundingClientRect().height ?? 0;
    dragStartYRef.current = e.clientY;
    dragOverIndexRef.current = null;

    setDragState({
      panelId,
      fromIndex,
      overIndex: null,
      offsetY: 0,
      height,
    });

    const grip = e.currentTarget;
    grip.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        const current = orderRef.current;
        const from = current.indexOf(panelId);
        if (from < 0) return;

        const to = getDropIndex(ev.clientY, current, panelRefs.current);
        const nextOver = to !== from ? to : null;
        dragOverIndexRef.current = nextOver;

        setDragState((prev) =>
          prev
            ? {
                ...prev,
                offsetY: ev.clientY - dragStartYRef.current,
                overIndex: nextOver,
              }
            : null
        );
      });
    };

    const endDrag = () => {
      grip.releasePointerCapture(e.pointerId);
      grip.removeEventListener("pointermove", onMove);
      grip.removeEventListener("pointerup", endDrag);
      grip.removeEventListener("pointercancel", endDrag);

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }

      const current = orderRef.current;
      const from = current.indexOf(panelId);
      const over = dragOverIndexRef.current;
      const to = over !== null && over !== from ? over : from;

      if (from >= 0 && to >= 0 && from !== to) {
        const next = reorderSidebarPanels(current, from, to);
        orderRef.current = next;
        setOrder(next);
        persistOrder(next);
      }

      dragOverIndexRef.current = null;
      setDragState(null);
    };

    grip.addEventListener("pointermove", onMove);
    grip.addEventListener("pointerup", endDrag);
    grip.addEventListener("pointercancel", endDrag);
  }

  const isDragging = dragState !== null;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {order.map((panelId, index) => {
        const expanded = panelExpanded[panelId];
        const slotDragging = dragState?.panelId === panelId;
        const showDropIndicator =
          isDragging &&
          dragState?.overIndex === index &&
          !slotDragging;
        const shiftY =
          dragState && !slotDragging
            ? getSidebarSlotShift(
                index,
                dragState.fromIndex,
                dragState.overIndex,
                dragState.height
              )
            : 0;

        return (
          <div
            key={panelId}
            data-sidebar-slot
            ref={setPanelRef(panelId)}
            style={{
              transform: slotDragging
                ? `translateY(${dragState.offsetY}px) scale(1.015)`
                : shiftY !== 0
                  ? `translateY(${shiftY}px)`
                  : undefined,
              transition: slotDragging
                ? "none"
                : "transform 200ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 200ms ease, opacity 200ms ease",
              zIndex: slotDragging ? 30 : undefined,
            }}
            className={cn(
              "relative flex min-h-0 flex-col will-change-transform",
              expanded
                ? expandedCount > 0
                  ? "flex-1 basis-0"
                  : "shrink-0"
                : "shrink-0",
              slotDragging &&
                "rounded-lg opacity-95 shadow-xl ring-2 ring-primary/40"
            )}
          >
            {showDropIndicator && (
              <div
                className="pointer-events-none absolute inset-x-3 top-0 z-50 h-1 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_10px] shadow-primary/60"
                aria-hidden
              />
            )}
            <PostItIconTooltip label="Drag to reorder" side="bottom">
              <button
                type="button"
                onPointerDown={(e) => handleGripPointerDown(panelId, e)}
                className={cn(
                  "absolute left-1 top-3 z-40 touch-none rounded p-1 text-muted-foreground/70 transition-colors hover:bg-muted/40 hover:text-foreground",
                  "cursor-grab active:cursor-grabbing",
                  slotDragging && "text-primary"
                )}
                aria-label="Drag to reorder panel"
                aria-grabbed={slotDragging}
              >
                <GripVertical
                  className={cn(
                    "h-4 w-4 transition-transform duration-150",
                    slotDragging && "scale-110"
                  )}
                />
              </button>
            </PostItIconTooltip>
            <div
              className={cn(
                "flex h-full min-h-0 flex-col pl-7",
                slotDragging && "pointer-events-none"
              )}
            >
              {panels[panelId]}
            </div>
          </div>
        );
      })}
    </div>
  );
}
