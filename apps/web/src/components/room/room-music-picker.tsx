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
  ClipboardPaste,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import type { MusicProvider, RoomTrack } from "@studyverce/shared";
import { TRACK_CATEGORIES, PROVIDER_LINK_EXAMPLES } from "@studyverce/shared";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getRoomPortalTarget, lockRoomScroll, ROOM_FIELD, ROOM_INNER_SURFACE } from "@/lib/room-ui";
import { cn } from "@/lib/utils";
import { parseMusicProviderUrl, PROVIDER_LABELS } from "@/lib/music/providers";
import { usePathname } from "next/navigation";
import type { AppSocket } from "@/hooks/use-socket";
import { useNotifications } from "@/components/notifications/notification-provider";
import { RoomMusicStreaming } from "@/components/room/room-music-streaming";
import { notificationMessages } from "@/lib/notifications/messages";
import {
  getTrackLibrary,
  getMyTracks,
  getMyMusicLibraryLimits,
  addProviderTrackLink,
  setRoomTrack,
  requestRoomTrack,
  toggleTrackPublic,
  deleteRoomTrack,
  updateRoomTrack,
  clearRoomTrack,
} from "@/app/rooms/music-actions";
import type { MusicLibraryLimits } from "@/lib/music/plan-limits";

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
  const [musicLimits, setMusicLimits] = useState<MusicLibraryLimits | null>(null);
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
      const [lib, my, limits] = await Promise.all([
        getTrackLibrary(category),
        getMyTracks(),
        getMyMusicLibraryLimits(),
      ]);
      setLibrary(lib);
      setMine(my);
      setMusicLimits(limits);
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
            <>
              {musicLimits && musicLimits.linkLimit !== null && (
                <p className="mb-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                  {musicLimits.linksUsed}/{musicLimits.linkLimit} music links used on your Free
                  plan.
                  {musicLimits.linksRemaining === 0
                    ? " Delete a track below to add another, or upgrade to Premium for unlimited links."
                    : " Delete tracks here to free space before adding more."}
                </p>
              )}
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
            </>
          )}

          {tab === "streaming" && (
            <RoomMusicStreaming
              returnPath={pathname || "/rooms"}
              isOwner={isOwner}
              pending={pending}
              limits={musicLimits}
              onAdded={(track) => {
                setMine((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
                setTab("mine");
              }}
              onPlay={handleOwnerPlay}
              onRequest={handleRequest}
            />
          )}

          {tab === "add-link" && (
            <PasteLinkForm
              pending={pending}
              uploadError={uploadError}
              limits={musicLimits}
              onSubmit={handleAddLink}
            />
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

const PASTE_LINK_PROVIDERS: {
  id: MusicProvider;
  label: string;
  iconSrc?: string;
  accent: string;
}[] = [
  {
    id: "spotify",
    label: "Spotify",
    iconSrc: "/streaming/spotify-icon.png",
    accent: "border-[#1DB954]/40 bg-[#1DB954]/10 text-[#1DB954]",
  },
  {
    id: "youtube",
    label: "YouTube",
    iconSrc: "/streaming/youtube-music-icon.png",
    accent: "border-[#FF0000]/40 bg-[#FF0000]/10 text-[#FF0000]",
  },
  {
    id: "soundcloud",
    label: "SoundCloud",
    accent: "border-[#FF5500]/40 bg-[#FF5500]/10 text-[#FF5500]",
  },
  {
    id: "apple_music",
    label: "Apple Music",
    iconSrc: "/streaming/apple-music-icon.png",
    accent: "border-[#FA243C]/40 bg-[#FA243C]/10 text-[#FA243C]",
  },
];

function PasteLinkForm({
  pending,
  uploadError,
  limits,
  onSubmit,
}: {
  pending: boolean;
  uploadError: string | null;
  limits: MusicLibraryLimits | null;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);

  const parsed = sourceUrl.trim() ? parseMusicProviderUrl(sourceUrl) : null;
  const showInvalid = touched && sourceUrl.trim().length > 0 && !parsed;
  const limitReached =
    limits !== null && limits.linkLimit !== null && limits.linksRemaining === 0;

  async function handlePaste() {
    setPasteError(null);
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        setPasteError("Clipboard is empty.");
        return;
      }
      setSourceUrl(text.trim());
      setTouched(true);
    } catch {
      setPasteError("Couldn't read clipboard — paste manually with ⌘V.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-5">
      {limits && limits.linkLimit !== null && (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            limitReached
              ? "border-destructive/30 bg-destructive/10 text-destructive"
              : "border-border/60 bg-muted/20 text-muted-foreground"
          )}
        >
          {limitReached
            ? `${limits.linksUsed}/${limits.linkLimit} music links used. Delete tracks in My Links before adding another, or upgrade to Premium.`
            : `${limits.linksUsed}/${limits.linkLimit} music links used on Free. Remove a track in My Links when you need room for new titles.`}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {PASTE_LINK_PROVIDERS.map((provider) => (
          <span
            key={provider.id}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              provider.accent
            )}
          >
            {provider.iconSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={provider.iconSrc} alt="" className="h-3.5 w-3.5 rounded-sm" />
            ) : (
              <Music2 className="h-3.5 w-3.5" />
            )}
            {provider.label}
          </span>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="track-source-url" className="text-sm font-medium">
            Track or playlist URL
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground"
            onClick={() => void handlePaste()}
          >
            <ClipboardPaste className="h-3.5 w-3.5" />
            Paste
          </Button>
        </div>
        <div className="relative">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="track-source-url"
            name="source_url"
            type="url"
            value={sourceUrl}
            onChange={(e) => {
              setSourceUrl(e.target.value);
              setPasteError(null);
            }}
            onBlur={() => setTouched(true)}
            placeholder="https://open.spotify.com/track/..."
            className={cn("pl-9 pr-10", ROOM_FIELD)}
            required
          />
          {parsed && (
            <CheckCircle2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
          )}
          {showInvalid && (
            <AlertCircle className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-destructive" />
          )}
        </div>
        {parsed && (
          <p className="flex items-center gap-1.5 text-xs text-primary">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            {PROVIDER_LABELS[parsed.provider]} link detected
          </p>
        )}
        {showInvalid && (
          <p className="flex items-center gap-1.5 text-xs text-destructive">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Unsupported link — use SoundCloud, YouTube, Spotify, or Apple Music
          </p>
        )}
        {pasteError && <p className="text-xs text-destructive">{pasteError}</p>}
      </div>

      <div className={cn("space-y-4 rounded-xl border border-border/60 p-4", ROOM_INNER_SURFACE)}>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Optional details
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="track-name">Display name</Label>
            <Input
              id="track-name"
              name="name"
              placeholder="Lo-fi focus playlist"
              maxLength={80}
              className={ROOM_FIELD}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="track-artist">Artist</Label>
            <Input
              id="track-artist"
              name="artist"
              placeholder="Artist or channel"
              maxLength={80}
              className={ROOM_FIELD}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="track-category">Category</Label>
            <select
              id="track-category"
              name="category"
              className={cn(
                "flex h-10 w-full rounded-lg border border-input px-3 text-sm capitalize",
                ROOM_FIELD
              )}
              defaultValue="ambient"
            >
              {TRACK_CATEGORIES.filter((c) => c !== "all").map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <label
            htmlFor="track-is-public"
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/50 bg-background/40 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
          >
            <input
              id="track-is-public"
              type="checkbox"
              name="is_public"
              className="mt-0.5 rounded border-input"
            />
            <span className="space-y-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                Share publicly
              </span>
              <span className="block text-xs text-muted-foreground">
                Others can find this in the community library
              </span>
            </span>
          </label>
        </div>
      </div>

      <details className="group rounded-lg border border-border/40 bg-muted/20 px-4 py-3">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm text-muted-foreground marker:content-none">
          <span>Example URL formats</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="mt-3 space-y-1.5 border-t border-border/40 pt-3 text-xs text-muted-foreground">
          {PROVIDER_LINK_EXAMPLES.map((example) => (
            <li key={example}>
              <button
                type="button"
                className="w-full truncate rounded px-1 py-0.5 text-left font-mono hover:bg-muted/60 hover:text-foreground"
                onClick={() => {
                  setSourceUrl(example);
                  setTouched(true);
                  setPasteError(null);
                }}
              >
                {example}
              </button>
            </li>
          ))}
        </ul>
      </details>

      {uploadError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {uploadError}
        </p>
      )}

      <Button
        type="submit"
        className="w-full gap-2"
        disabled={
          pending ||
          limitReached ||
          (touched && !parsed && sourceUrl.trim().length > 0)
        }
      >
        <Link2 className="h-4 w-4" />
        {pending ? "Adding..." : "Add to library"}
      </Button>
    </form>
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
