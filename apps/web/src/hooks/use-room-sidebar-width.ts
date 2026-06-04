"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "studyverce-room-sidebar-width";

export const ROOM_SIDEBAR_WIDTH_DEFAULT = 320;
export const ROOM_SIDEBAR_WIDTH_MIN = 260;
/** Sidebar may use at most half of the viewport width. */
export const ROOM_SIDEBAR_WIDTH_MAX_RATIO = 0.5;

function maxWidthForViewport(viewportWidth = typeof window !== "undefined" ? window.innerWidth : 1280) {
  return Math.floor(viewportWidth * ROOM_SIDEBAR_WIDTH_MAX_RATIO);
}

function clampWidth(value: number, viewportWidth?: number) {
  const max = maxWidthForViewport(viewportWidth);
  return Math.round(Math.max(ROOM_SIDEBAR_WIDTH_MIN, Math.min(max, value)));
}

function readStoredWidth(): number {
  if (typeof window === "undefined") return ROOM_SIDEBAR_WIDTH_DEFAULT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clampWidth(ROOM_SIDEBAR_WIDTH_DEFAULT);
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n)) return clampWidth(ROOM_SIDEBAR_WIDTH_DEFAULT);
    return clampWidth(n);
  } catch {
    return clampWidth(ROOM_SIDEBAR_WIDTH_DEFAULT);
  }
}

export function useRoomSidebarWidth() {
  const [width, setWidth] = useState(ROOM_SIDEBAR_WIDTH_DEFAULT);
  const [isResizing, setIsResizing] = useState(false);
  const widthRef = useRef(width);

  useEffect(() => {
    setWidth(readStoredWidth());

    const onResize = () => {
      setWidth((prev) => {
        const next = clampWidth(prev);
        widthRef.current = next;
        return next;
      });
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (!isResizing) return;

    const prevSelect = document.body.style.userSelect;
    const prevCursor = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      document.body.style.userSelect = prevSelect;
      document.body.style.cursor = prevCursor;
    };
  }, [isResizing]);

  const startResize = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);

    const startX = e.clientX;
    const startWidth = widthRef.current;
    setIsResizing(true);

    const onMove = (ev: PointerEvent) => {
      const delta = startX - ev.clientX;
      const next = clampWidth(startWidth + delta);
      widthRef.current = next;
      setWidth(next);
    };

    const onUp = () => {
      handle.releasePointerCapture(e.pointerId);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      setIsResizing(false);
      try {
        localStorage.setItem(STORAGE_KEY, String(widthRef.current));
      } catch {
        /* quota */
      }
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  }, []);

  return { width, isResizing, startResize, maxWidth: maxWidthForViewport() };
}
