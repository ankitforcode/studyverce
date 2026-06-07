"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  Music2,
  Link2,
  Globe,
  Lock,
  X,
  Trash2,
  Clock,
  User,
  Pencil,
} from "lucide-react";
import type { RoomTrack } from "@studyverce/shared";
import { TRACK_CATEGORIES, PROVIDER_LINK_EXAMPLES } from "@studyverce/shared";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getRoomPortalTarget, lockRoomScroll } from "@/lib/room-ui";
import { cn } from "@/lib/utils";
import { PROVIDER_LABELS } from "@/lib/music/providers";
import { usePathname } from "next/navigation";
import type { AppSocket } from "@/hooks/use-socket";
import { useNotifications } from "@/components/notifications/notification-provider";
import { RoomMusicStreaming } from "@/components/room/room-music-streaming";
import { notificationMessages } from "@/lib/notifications/messages";
import {
  getTrackLibrary,
  getMyTracks,
  addProviderTrackLink,
  setRoomTrack,
  requestRoomTrack,
  toggleTrackPublic,
  deleteRoomTrack,
  updateRoomTrack,
  clearRoomTrack,
} from "@/app/rooms/music-actions";

interface RoomMusicPickerProps {
  roomId: string;
  currentTrackId: string | null;
  isOwner: boolean;
  onApply: (track: RoomTrack | null, isPlaying: boolean) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  socket: AppSocket | null;
  portalContainerRef?: RefObject<HTMLElement | null>;
}

type Tab = "library" | "community" | "mine" | "streaming" | "add-link";

export function RoomMusicPicker({
  roomId,
  currentTrackId,
  isOwner,
  onApply,
  open,
  onOpenChange,
  socket,
  portalContainerRef,
}: RoomMusicPickerProps) {
  const [tab, setTab] = useState<Tab>("library");
  const [category, setCategory] = useState("all");
  const [library, setLibrary] = useState<RoomTrack[]>([]);
  const [mine, setMine] = useState<RoomTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const { toast } = useNotifications();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    return lockRoomScroll(portalContainerRef);
  }, [open, portalContainerRef]);

  const loadTracks = useCallback(async () => {
    setLoading(true);
    try {
      const [lib, my] = await Promise.all([getTrackLibrary(category), getMyTracks()]);
      setLibrary(lib);
      setMine(my);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    if (open) loadTracks();
  }, [open, loadTracks]);

  const builtins = library.filter((t) => t.isBuiltin);
  const community = library.filter((t) => !t.isBuiltin && t.isPublic);

  async function handleOwnerPlay(track: RoomTrack) {
    if (!isOwner) return;
    setActionError(null);
    startTransition(async () => {
      const result = await setRoomTrack(roomId, track.id);
      if (result.error) {
        setActionError(result.error);
        return;
      }
      onApply(result.track ?? track, true);
      onOpenChange(false);
    });
  }

  async function handleRequest(track: RoomTrack) {
    if (isOwner) return;
    setActionError(null);
    startTransition(async () => {
      const result = await requestRoomTrack(roomId, track.id);
      if (result.error) {
        setActionError(result.error);
        toast(notificationMessages.actionError(result.error));
        return;
      }
      setActionError("Request sent! Waiting for the room owner to approve.");
      toast(notificationMessages.musicRequestSent(track.name));
      if (result.request) {
        socket?.emit("music:request-created", {
          roomId,
          request: result.request,
        });
      }
    });
  }

  async function handleAddLink(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await addProviderTrackLink({ error: null, success: false }, formData);
      if (result.error) {
        setUploadError(result.error);
        return;
      }
      await loadTracks();
      setTab("mine");
    });
  }

  async function handleStopMusic() {
    if (!isOwner) return;
    startTransition(async () => {
      const result = await clearRoomTrack(roomId);
      if (!result.error) {
        onApply(null, false);
        onOpenChange(false);
      }
    });
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close dialog"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-music-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 id="room-music-title" className="text-lg font-semibold">
              Room Music
            </h2>
            <p className="text-sm text-muted-foreground">
              {isOwner
                ? "Connect Spotify, YouTube Music, or Apple Music — or paste a link"
                : "Browse tracks and request one — the room owner must approve"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-6 pt-4 pb-0">
          {(
            [
              ["library", "Library"],
              ["community", "Community"],
              ["mine", "My Links"],
              ["streaming", "Streaming"],
              ["add-link", "Paste link"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition-colors",
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
          {actionError && (
            <p
              className={cn(
                "mb-4 rounded-lg border px-3 py-2 text-sm",
                actionError.startsWith("Request sent")
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              )}
            >
              {actionError}
            </p>
          )}

          {tab === "library" && (
            <>
              <div className="mb-4 flex flex-wrap gap-2">
                {TRACK_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs capitalize",
                      category === cat
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-border text-muted-foreground"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <TrackList
                tracks={builtins}
                loading={loading}
                currentId={currentTrackId}
                isOwner={isOwner}
                pending={pending}
                onPlay={handleOwnerPlay}
                onRequest={handleRequest}
              />
            </>
          )}

          {tab === "community" && (
            <TrackList
              tracks={community}
              loading={loading}
              currentId={currentTrackId}
              isOwner={isOwner}
              pending={pending}
              onPlay={handleOwnerPlay}
              onRequest={handleRequest}
              emptyMessage="No community tracks yet. Add a link and mark it public!"
            />
          )}

          {tab === "mine" && (
            <TrackList
              tracks={mine}
              loading={loading}
              currentId={currentTrackId}
              isOwner={isOwner}
              pending={pending}
              onPlay={handleOwnerPlay}
              onRequest={handleRequest}
              emptyMessage="You haven't added any provider links yet."
              showManage
              onTogglePublic={async (id, isPublic) => {
                await toggleTrackPublic(id, isPublic);
                loadTracks();
              }}
              onDelete={async (id) => {
                await deleteRoomTrack(id);
                loadTracks();
              }}
              onTrackUpdated={(track) => {
                if (currentTrackId === track.id) {
                  onApply(track, true);
                }
                loadTracks();
              }}
            />
          )}

          {tab === "streaming" && (
            <RoomMusicStreaming
              returnPath={pathname || "/rooms"}
              isOwner={isOwner}
              pending={pending}
              onAdded={(track) => {
                setMine((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
                setTab("mine");
              }}
              onPlay={handleOwnerPlay}
              onRequest={handleRequest}
            />
          )}

          {tab === "add-link" && (
            <form onSubmit={handleAddLink} className="max-w-md space-y-4">
              <div className="space-y-2">
                <Label htmlFor="track-source-url">
                  SoundCloud, YouTube, Spotify, or Apple Music URL
                </Label>
                <Input
                  id="track-source-url"
                  name="source_url"
                  type="url"
                  placeholder="https://open.spotify.com/track/..."
                  required
                />
                <ul className="text-xs text-muted-foreground space-y-1 pt-1">
                  {PROVIDER_LINK_EXAMPLES.map((example) => (
                    <li key={example} className="font-mono truncate">
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <Label htmlFor="track-name">Display name (optional)</Label>
                <Input id="track-name" name="name" placeholder="Lo-fi focus playlist" maxLength={80} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="track-artist">Artist (optional)</Label>
                <Input id="track-artist" name="artist" placeholder="Artist or channel" maxLength={80} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="track-category">Category</Label>
                <select
                  id="track-category"
                  name="category"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  defaultValue="ambient"
                >
                  {TRACK_CATEGORIES.filter((c) => c !== "all").map((cat) => (
                    <option key={cat} value={cat} className="capitalize">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="is_public" className="rounded" />
                <Globe className="h-4 w-4 text-muted-foreground" />
                Share publicly so others can use this track
              </label>
              {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}
              <Button type="submit" className="w-full gap-2" disabled={pending}>
                <Link2 className="h-4 w-4" />
                {pending ? "Adding..." : "Add from provider"}
              </Button>
            </form>
          )}

        </div>

        <div className="flex justify-between border-t border-border px-6 py-3">
          {isOwner ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStopMusic}
              disabled={pending || !currentTrackId}
            >
              Stop music
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground self-center">
              Music plays automatically while someone is in the room
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </div>
    </div>,
    getRoomPortalTarget(portalContainerRef)
  );
}

function TrackEditForm({
  track,
  pending,
  onCancel,
  onSave,
}: {
  track: RoomTrack;
  pending: boolean;
  onCancel: () => void;
  onSave: (input: {
    name: string;
    artist: string | null;
    category: string;
    isPublic: boolean;
    sourceUrl: string | null;
  }) => void;
}) {
  const [name, setName] = useState(track.name);
  const [artist, setArtist] = useState(track.artist ?? "");
  const [category, setCategory] = useState(track.category);
  const [isPublic, setIsPublic] = useState(track.isPublic);
  const [sourceUrl, setSourceUrl] = useState(track.sourceUrl ?? "");

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor={`edit-name-${track.id}`}>Title</Label>
          <Input
            id={`edit-name-${track.id}`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-artist-${track.id}`}>Artist</Label>
          <Input
            id={`edit-artist-${track.id}`}
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            maxLength={80}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`edit-category-${track.id}`}>Category</Label>
          <select
            id={`edit-category-${track.id}`}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            {TRACK_CATEGORIES.filter((c) => c !== "all").map((cat) => (
              <option key={cat} value={cat} className="capitalize">
                {cat}
              </option>
            ))}
          </select>
        </div>
        {track.provider !== "builtin" && (
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`edit-url-${track.id}`}>Provider URL</Label>
            <Input
              id={`edit-url-${track.id}`}
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          className="rounded"
        />
        <Globe className="h-4 w-4 text-muted-foreground" />
        Share publicly in the community library
      </label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={pending || !name.trim()}
          onClick={() =>
            onSave({
              name: name.trim(),
              artist: artist.trim() || null,
              category,
              isPublic,
              sourceUrl: sourceUrl.trim() || null,
            })
          }
        >
          {pending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

function TrackList({
  tracks,
  loading,
  currentId,
  isOwner,
  pending,
  onPlay,
  onRequest,
  emptyMessage = "No tracks found.",
  showManage = false,
  onTogglePublic,
  onDelete,
  onTrackUpdated,
}: {
  tracks: RoomTrack[];
  loading: boolean;
  currentId: string | null;
  isOwner: boolean;
  pending: boolean;
  onPlay: (track: RoomTrack) => void;
  onRequest: (track: RoomTrack) => void;
  emptyMessage?: string;
  showManage?: boolean;
  onTogglePublic?: (id: string, isPublic: boolean) => void;
  onDelete?: (id: string) => void;
  onTrackUpdated?: (track: RoomTrack) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editPending, startEditTransition] = useTransition();

  if (loading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>;
  }

  if (tracks.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {editError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {editError}
        </p>
      )}
      {tracks.map((track) => (
        <div
          key={track.id}
          className={cn(
            "rounded-lg border p-3 transition-colors",
            currentId === track.id ? "border-primary bg-primary/5" : "border-border"
          )}
        >
          <div className="group flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Music2 className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{track.name}</p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {track.artist && <span>{track.artist}</span>}
                {track.durationSeconds && (
                  <span className="flex items-center gap-0.5">
                    <Clock className="h-3 w-3" />
                    {Math.floor(track.durationSeconds / 60)}m
                  </span>
                )}
                <Badge variant="outline" className="px-1 py-0 text-[10px] capitalize">
                  {PROVIDER_LABELS[track.provider] ?? track.provider}
                </Badge>
                {track.isBuiltin && (
                  <Badge variant="secondary" className="px-1 py-0 text-[10px]">
                    Built-in
                  </Badge>
                )}
                {track.isPublic && !track.isBuiltin && (
                  <Badge variant="default" className="px-1 py-0 text-[10px]">
                    Public
                  </Badge>
                )}
              </div>
            </div>

            {showManage && onTogglePublic && onDelete && (
              <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  title="Edit track info"
                  onClick={() => {
                    setEditError(null);
                    setEditingId(editingId === track.id ? null : track.id);
                  }}
                  className="rounded bg-muted p-1.5 hover:bg-muted/80"
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title={track.isPublic ? "Make private" : "Share publicly"}
                  onClick={() => onTogglePublic(track.id, !track.isPublic)}
                  className="rounded bg-muted p-1.5 hover:bg-muted/80"
                >
                  {track.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                </button>
                <button
                  type="button"
                  title="Delete"
                  onClick={() => onDelete(track.id)}
                  className="rounded bg-muted p-1.5 hover:bg-destructive hover:text-white"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            )}

            {isOwner ? (
              <Button size="sm" disabled={pending} onClick={() => onPlay(track)}>
                {currentId === track.id ? "Playing" : "Play"}
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled={pending} onClick={() => onRequest(track)}>
                <User className="mr-1 h-3.5 w-3.5" />
                Request
              </Button>
            )}
          </div>

          {showManage && editingId === track.id && (
            <TrackEditForm
              track={track}
              pending={editPending}
              onCancel={() => setEditingId(null)}
              onSave={(input) => {
                setEditError(null);
                startEditTransition(async () => {
                  const result = await updateRoomTrack(track.id, input);
                  if (result.error) {
                    setEditError(result.error);
                    return;
                  }
                  setEditingId(null);
                  if (result.track) {
                    onTrackUpdated?.(result.track);
                  }
                });
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export function RoomMusicPickerTrigger({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <Button variant="outline" size="sm" className="gap-2" onClick={onClick}>
      <Music2 className="h-4 w-4" />
      Music
    </Button>
  );
}
