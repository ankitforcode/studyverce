"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

export function useRoomFullscreen(targetRef: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function syncFullscreen() {
      setIsFullscreen(document.fullscreenElement === targetRef.current);
    }

    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, [targetRef]);

  const toggleFullscreen = useCallback(async () => {
    const el = targetRef.current;
    if (!el || !document.fullscreenEnabled) return;

    try {
      if (document.fullscreenElement === el) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      /* user denied or browser blocked */
    }
  }, [targetRef]);

  return { isFullscreen, toggleFullscreen, supported: typeof document !== "undefined" };
}
