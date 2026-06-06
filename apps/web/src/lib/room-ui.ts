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
  "bg-card/20 backdrop-blur-xl border-border/40 shadow-sm supports-[backdrop-filter]:bg-card/15 light:bg-card/92 light:supports-[backdrop-filter]:bg-card/90 light:border-border/90 light:shadow-md";

/** Shared glass style for header controls (theme, background, etc.) */
export const ROOM_HEADER_CONTROL =
  "rounded-lg border border-border/40 bg-card/20 shadow-sm backdrop-blur-sm light:bg-white/95 light:border-border/80";

/** Floating widgets (pomodoro) — slightly more legible */
export const ROOM_GLASS_PANEL =
  "bg-card/45 backdrop-blur-lg border-border/40 shadow-md supports-[backdrop-filter]:bg-card/35 light:bg-card/96 light:supports-[backdrop-filter]:bg-card/94 light:border-border/90 light:shadow-lg";

/** Bottom toolbars (post-it bar) */
export const ROOM_TOOLBAR_PANEL =
  "bg-card/90 shadow-lg backdrop-blur-md supports-[backdrop-filter]:bg-card/80 light:bg-white/96 light:supports-[backdrop-filter]:bg-white/94 light:border-border light:shadow-md";

/** Nested cards inside sidebar / panels */
export const ROOM_INNER_SURFACE =
  "bg-card/25 backdrop-blur-sm light:bg-white/90 light:border-border/80";

/** Form fields on glass panels */
export const ROOM_FIELD =
  "bg-background/80 light:bg-white light:border-border/90 light:shadow-sm";
