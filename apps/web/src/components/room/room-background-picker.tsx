"use client";

import { useCallback, useEffect, useState, useTransition, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ImageIcon, Upload, Globe, Lock, X, Check, Trash2 } from "lucide-react";
import type { RoomWallpaper } from "@studyverce/shared";
import { WALLPAPER_CATEGORIES } from "@studyverce/shared";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import {
  getRoomPortalTarget,
  lockRoomScroll,
  ROOM_HEADER_CONTROL,
} from "@/lib/room-ui";
import { cn } from "@/lib/utils";
import {
  getWallpaperLibrary,
  getMyWallpapers,
  uploadRoomWallpaper,
  setRoomWallpaper,
  setRoomWallpaperOverlayOpacity,
  toggleWallpaperPublic,
  deleteRoomWallpaper,
} from "@/app/rooms/wallpaper-actions";
import { WALLPAPER_OVERLAY_MAX, WALLPAPER_OVERLAY_MIN } from "@studyverce/shared";

interface RoomBackgroundPickerProps {
  roomId: string;
  currentWallpaperId: string | null;
  backgroundUrl?: string | null;
  canManage: boolean;
  isOwner: boolean;
  overlayOpacity: number;
  onOverlayChange: (opacity: number) => void;
  onApply: (wallpaperId: string | null, imageUrl: string | null) => void;
  portalContainerRef?: RefObject<HTMLElement | null>;
}

type Tab = "library" | "community" | "mine" | "upload";

export function RoomBackgroundPicker({
  roomId,
  currentWallpaperId,
  backgroundUrl = null,
  canManage,
  isOwner,
  overlayOpacity,
  onOverlayChange,
  onApply,
  portalContainerRef,
}: RoomBackgroundPickerProps) {
  const [open, setOpen] = useState(false);
  const [draftOverlay, setDraftOverlay] = useState(overlayOpacity);
  const [tab, setTab] = useState<Tab>("library");
  const [category, setCategory] = useState("all");
  const [library, setLibrary] = useState<RoomWallpaper[]>([]);
  const [mine, setMine] = useState<RoomWallpaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setDraftOverlay(overlayOpacity);
  }, [overlayOpacity]);

  useEffect(() => {
    if (!open) return;
    return lockRoomScroll(portalContainerRef);
  }, [open, portalContainerRef]);

  const loadWallpapers = useCallback(async () => {
    setLoading(true);
    try {
      const [lib, my] = await Promise.all([
        getWallpaperLibrary(category),
        getMyWallpapers(),
      ]);
      setLibrary(lib);
      setMine(my);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    if (open) loadWallpapers();
  }, [open, loadWallpapers]);

  const builtins = library.filter((w) => w.isBuiltin);
  const community = library.filter((w) => !w.isBuiltin && w.isPublic);

  async function handleSelect(wallpaper: RoomWallpaper | null) {
    if (!canManage) return;
    startTransition(async () => {
      const result = await setRoomWallpaper(roomId, wallpaper?.id ?? null);
      if (!result.error) {
        onApply(wallpaper?.id ?? null, result.imageUrl ?? wallpaper?.imageUrl ?? null);
        setOpen(false);
      }
    });
  }

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await uploadRoomWallpaper({ error: null, success: false }, formData);
      if (result.error) {
        setUploadError(result.error);
        return;
      }
      await loadWallpapers();
      setTab("mine");
      if (result.wallpaper) {
        await handleSelect(result.wallpaper);
      }
    });
  }

  if (!canManage) return null;

  return (
    <>
      <PostItIconTooltip label="Background" side="bottom">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label="Change room background"
          onClick={() => setOpen(true)}
          className={cn(
            ROOM_HEADER_CONTROL,
            "h-8 w-8 p-0 hover:border-border/60 hover:bg-card/35 light:hover:bg-white/90"
          )}
        >
          {backgroundUrl ? (
            <span
              className="relative h-5 w-5 shrink-0 overflow-hidden rounded-md border border-border/50 ring-1 ring-black/10"
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={backgroundUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            </span>
          ) : (
            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>
      </PostItIconTooltip>

      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label="Close dialog"
              onClick={() => setOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="room-background-title"
              className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
            >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h2 id="room-background-title" className="text-lg font-semibold">
                  Room Background
                </h2>
                <p className="text-sm text-muted-foreground">
                  Choose from the library, upload your own, or share with the community
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-1 px-6 pt-4 border-b border-border pb-0 overflow-x-auto">
              {(
                [
                  ["library", "Library"],
                  ["community", "Community"],
                  ["mine", "My Uploads"],
                  ["upload", "Upload"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
                    tab === id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {tab === "library" && (
                <>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {WALLPAPER_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={cn(
                          "rounded-full px-3 py-1 text-xs border capitalize",
                          category === cat
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border text-muted-foreground"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <WallpaperGrid
                    wallpapers={builtins}
                    loading={loading}
                    currentId={currentWallpaperId}
                    onSelect={handleSelect}
                    pending={pending}
                  />
                </>
              )}

              {tab === "community" && (
                <WallpaperGrid
                  wallpapers={community}
                  loading={loading}
                  currentId={currentWallpaperId}
                  onSelect={handleSelect}
                  pending={pending}
                  emptyMessage="No community wallpapers yet. Upload one and mark it public!"
                />
              )}

              {tab === "mine" && (
                <WallpaperGrid
                  wallpapers={mine}
                  loading={loading}
                  currentId={currentWallpaperId}
                  onSelect={handleSelect}
                  pending={pending}
                  emptyMessage="You haven't uploaded any wallpapers yet."
                  showManage
                  onTogglePublic={async (id, isPublic) => {
                    await toggleWallpaperPublic(id, isPublic);
                    loadWallpapers();
                  }}
                  onDelete={async (id) => {
                    await deleteRoomWallpaper(id);
                    loadWallpapers();
                  }}
                />
              )}

              {tab === "upload" && (
                <form onSubmit={handleUpload} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="wallpaper-file">High-quality image (JPEG, PNG, WebP — max 15 MB)</Label>
                    <Input
                      id="wallpaper-file"
                      name="file"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wallpaper-name">Name</Label>
                    <Input id="wallpaper-name" name="name" placeholder="My study vibe" maxLength={80} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="wallpaper-category">Category</Label>
                    <select
                      id="wallpaper-category"
                      name="category"
                      className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                      defaultValue="general"
                    >
                      {WALLPAPER_CATEGORIES.filter((c) => c !== "all").map((cat) => (
                        <option key={cat} value={cat} className="capitalize">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="is_public" className="rounded" />
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    Share publicly so others can use this background
                  </label>
                  {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
                  <Button type="submit" className="gap-2 w-full" disabled={pending}>
                    <Upload className="h-4 w-4" />
                    {pending ? "Uploading..." : "Upload & Apply"}
                  </Button>
                </form>
              )}
            </div>

            {isOwner && (
              <div className="border-t border-border px-6 py-4">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="wallpaper-overlay" className="text-sm font-medium">
                    Wallpaper dimming
                  </Label>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {draftOverlay}%
                  </span>
                </div>
                <input
                  id="wallpaper-overlay"
                  type="range"
                  min={WALLPAPER_OVERLAY_MIN}
                  max={WALLPAPER_OVERLAY_MAX}
                  value={draftOverlay}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setDraftOverlay(next);
                    onOverlayChange(next);
                  }}
                  onPointerUp={(e) => {
                    const next = Number(e.currentTarget.value);
                    void setRoomWallpaperOverlayOpacity(roomId, next);
                  }}
                  onKeyUp={(e) => {
                    const next = Number(e.currentTarget.value);
                    void setRoomWallpaperOverlayOpacity(roomId, next);
                  }}
                  className="mt-2 h-2 w-full cursor-pointer accent-primary"
                />
                <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>Brighter</span>
                  <span>Darker</span>
                </div>
              </div>
            )}

            <div className="border-t border-border px-6 py-3 flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSelect(null)}
                disabled={pending || !currentWallpaperId}
              >
                Remove background
              </Button>
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Close
              </Button>
            </div>
          </div>
          </div>,
          getRoomPortalTarget(portalContainerRef)
        )}
    </>
  );
}

function WallpaperGrid({
  wallpapers,
  loading,
  currentId,
  onSelect,
  pending,
  emptyMessage = "No wallpapers found.",
  showManage = false,
  onTogglePublic,
  onDelete,
}: {
  wallpapers: RoomWallpaper[];
  loading: boolean;
  currentId: string | null;
  onSelect: (w: RoomWallpaper) => void;
  pending: boolean;
  emptyMessage?: string;
  showManage?: boolean;
  onTogglePublic?: (id: string, isPublic: boolean) => void;
  onDelete?: (id: string) => void;
}) {
  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Loading...</p>;
  }

  if (wallpapers.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">{emptyMessage}</p>;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {wallpapers.map((wp) => (
        <div key={wp.id} className="group relative">
          <button
            type="button"
            disabled={pending}
            onClick={() => onSelect(wp)}
            className={cn(
              "relative w-full aspect-video rounded-lg overflow-hidden border-2 transition-all",
              currentId === wp.id
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-primary/50"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={wp.thumbnailUrl ?? wp.imageUrl}
              alt={wp.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-2 text-left">
              <p className="text-xs font-medium text-white truncate">{wp.name}</p>
              <div className="flex gap-1 mt-0.5">
                {wp.isBuiltin && <Badge variant="secondary" className="text-[10px] px-1 py-0">Built-in</Badge>}
                {wp.isPublic && !wp.isBuiltin && (
                  <Badge variant="default" className="text-[10px] px-1 py-0">Public</Badge>
                )}
              </div>
            </div>
            {currentId === wp.id && (
              <div className="absolute top-2 right-2 rounded-full bg-primary p-1">
                <Check className="h-3 w-3 text-primary-foreground" />
              </div>
            )}
          </button>

          {showManage && onTogglePublic && onDelete && (
            <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                title={wp.isPublic ? "Make private" : "Share publicly"}
                onClick={(e) => {
                  e.stopPropagation();
                  onTogglePublic(wp.id, !wp.isPublic);
                }}
                className="rounded bg-black/60 p-1.5 text-white hover:bg-black/80"
              >
                {wp.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
              </button>
              <button
                type="button"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(wp.id);
                }}
                className="rounded bg-black/60 p-1.5 text-white hover:bg-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
