import {
  DEFAULT_WALLPAPER_OVERLAY,
  WALLPAPER_OVERLAY_MAX,
  WALLPAPER_OVERLAY_MIN,
  type StudyRoomSettings,
} from "@studyverce/shared";

export function clampWallpaperOverlay(value: number): number {
  return Math.min(
    WALLPAPER_OVERLAY_MAX,
    Math.max(WALLPAPER_OVERLAY_MIN, Math.round(value))
  );
}

export function resolveWallpaperOverlay(
  settings?: Partial<StudyRoomSettings> | null
): number {
  const raw = settings?.wallpaperOverlayOpacity;
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    return DEFAULT_WALLPAPER_OVERLAY;
  }
  return clampWallpaperOverlay(raw);
}

export function wallpaperImageFilter(overlayOpacity: number): string {
  const lift = 1 - overlayOpacity / 100;
  const brightness = 1 + lift * 0.18;
  const saturate = 1 + lift * 0.08;
  return `brightness(${brightness}) saturate(${saturate}) contrast(1.02)`;
}
