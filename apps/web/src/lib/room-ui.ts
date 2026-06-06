import type { RefObject } from "react";

/** Portal modals to body (avoids room shell clipping). Use room root only in fullscreen. */
export function getRoomPortalTarget(
  containerRef?: RefObject<HTMLElement | null>
): HTMLElement {
  if (typeof document === "undefined") {
    return null as unknown as HTMLElement;
  }

  const container = containerRef?.current;
  const fullscreen = document.fullscreenElement;

  if (container && fullscreen === container) {
    return container;
  }

  return document.body;
}

export function lockRoomScroll(
  containerRef?: RefObject<HTMLElement | null>
): () => void {
  const target = getRoomPortalTarget(containerRef);
  const previousOverflow = target.style.overflow;
  target.style.overflow = "hidden";
  return () => {
    target.style.overflow = previousOverflow;
  };
}

/** Header + sidebar chrome — lets wallpaper show through */
export const ROOM_CHROME_PANEL =
  "bg-card/20 backdrop-blur-xl border-border/40 shadow-sm supports-[backdrop-filter]:bg-card/15";

/** Shared glass style for header controls (theme, background, etc.) */
export const ROOM_HEADER_CONTROL =
  "rounded-lg border border-border/40 bg-card/20 shadow-sm backdrop-blur-sm";

/** Floating widgets (pomodoro) — slightly more legible */
export const ROOM_GLASS_PANEL =
  "bg-card/45 backdrop-blur-lg border-border/40 shadow-md supports-[backdrop-filter]:bg-card/35";
