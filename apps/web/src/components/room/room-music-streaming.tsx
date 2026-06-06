"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  ChevronLeft,
  Loader2,
  LogOut,
  Music2,
  Plus,
  ListMusic,
  Search,
} from "lucide-react";
import type {
  RoomTrack,
  StreamingMusicConnection,
  StreamingMusicProvider,
  StreamingPlaylist,
  StreamingPlaylistItem,
} from "@studyverce/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getStreamingMusicConnections,
  disconnectStreamingProvider,
  fetchStreamingPlaylists,
  fetchStreamingPlaylistItems,
  searchStreamingYouTubeVideos,
  addStreamingItemToLibrary,
} from "@/app/rooms/music-streaming-actions";

const PROVIDER_META: Record<
  StreamingMusicProvider,
  {
    label: string;
    iconSrc: string;
    buttonClass: string;
    connectLabel: string;
  }
> = {
  spotify: {
    label: "Spotify",
    iconSrc: "/streaming/spotify-icon.png",
    buttonClass:
      "bg-[#1DB954] text-white hover:bg-[#1ed760] shadow-md shadow-[#1DB954]/25 border-transparent",
    connectLabel: "Connect Spotify",
  },
  youtube_music: {
    label: "YouTube Music",
    iconSrc: "/streaming/youtube-music-icon.png",
    buttonClass:
      "bg-[#FF0000] text-white hover:bg-[#ff1a1a] shadow-md shadow-[#FF0000]/25 border-transparent",
    connectLabel: "Connect YouTube Music",
  },
  apple_music: {
    label: "Apple Music",
    iconSrc: "/streaming/apple-music-icon.png",
    buttonClass:
      "bg-gradient-to-r from-[#FA243C] to-[#FB5C74] text-white hover:from-[#e01f35] hover:to-[#f04a62] shadow-md shadow-[#FA243C]/25 border-transparent",
    connectLabel: "Connect Apple Music",
  },
};

declare global {
  interface Window {
    MusicKit?: {
      configure: (config: {
        developerToken: string;
        app: { name: string; build: string };
      }) => Promise<unknown>;
      getInstance: () => {
        authorize: () => Promise<unknown>;
        musicUserToken: string;
        isAuthorized: boolean;
      };
    };
  }
}

function loadMusicKitScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.MusicKit) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="musickit"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Apple MusicKit"));
    document.head.appendChild(script);
  });
}

interface RoomMusicStreamingProps {
  returnPath: string;
  isOwner: boolean;
  pending: boolean;
  onAdded: (track: RoomTrack) => void;
  onPlay: (track: RoomTrack) => void;
  onRequest: (track: RoomTrack) => void;
}

export function RoomMusicStreaming({
  returnPath,
  isOwner,
  pending,
  onAdded,
  onPlay,
  onRequest,
}: RoomMusicStreamingProps) {
  const [connections, setConnections] = useState<StreamingMusicConnection[]>([]);
  const [configured, setConfigured] = useState<
    Record<StreamingMusicProvider, boolean>
  >({
    spotify: false,
    youtube_music: false,
    apple_music: false,
  });
  const [activeProvider, setActiveProvider] = useState<StreamingMusicProvider | null>(
    null
  );
  const [playlists, setPlaylists] = useState<StreamingPlaylist[]>([]);
  const [items, setItems] = useState<StreamingPlaylistItem[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<StreamingPlaylist | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, startTransition] = useTransition();
  const [appleConnecting, setAppleConnecting] = useState(false);
  const [youtubeSearchQuery, setYoutubeSearchQuery] = useState("");
  const [youtubeSearchResults, setYoutubeSearchResults] = useState<
    StreamingPlaylistItem[]
  >([]);
  const [youtubeSearchLoading, setYoutubeSearchLoading] = useState(false);

  const refreshConnections = useCallback(async () => {
    const data = await getStreamingMusicConnections();
    setConnections(data.connections);
    setConfigured(data.configured);
  }, []);

  useEffect(() => {
    void refreshConnections();
  }, [refreshConnections]);

  const connectionByProvider = Object.fromEntries(
    connections.map((c) => [c.provider, c])
  ) as Record<StreamingMusicProvider, StreamingMusicConnection>;

  function handleOAuthConnect(provider: StreamingMusicProvider) {
    const params = new URLSearchParams({ returnTo: returnPath });
    window.location.href = `/api/music/${provider}/authorize?${params}`;
  }

  async function handleAppleConnect() {
    setError(null);
    setAppleConnecting(true);
    try {
      await loadMusicKitScript();
      const res = await fetch("/api/music/apple/developer-token");
      const json = (await res.json()) as { developerToken?: string; error?: string };
      if (!res.ok || !json.developerToken) {
        throw new Error(json.error ?? "Apple Music is not configured");
      }

      await window.MusicKit!.configure({
        developerToken: json.developerToken,
        app: { name: "StudyVerce", build: "1.0.0" },
      });

      const music = window.MusicKit!.getInstance();
      await music.authorize();

      const connectRes = await fetch("/api/music/apple/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          musicUserToken: music.musicUserToken,
          displayName: "Apple Music",
        }),
      });

      if (!connectRes.ok) {
        const err = (await connectRes.json()) as { error?: string };
        throw new Error(err.error ?? "Failed to save Apple Music connection");
      }

      await refreshConnections();
      setActiveProvider("apple_music");
      await loadPlaylists("apple_music");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apple Music connect failed");
    } finally {
      setAppleConnecting(false);
    }
  }

  async function loadPlaylists(provider: StreamingMusicProvider) {
    setLoading(true);
    setError(null);
    setSelectedPlaylist(null);
    setItems([]);
    const result = await fetchStreamingPlaylists(provider);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setPlaylists([]);
      return;
    }
    setPlaylists(result.playlists);
  }

  async function openProvider(provider: StreamingMusicProvider) {
    setActiveProvider(provider);
    setYoutubeSearchQuery("");
    setYoutubeSearchResults([]);
    await loadPlaylists(provider);
  }

  async function handleYoutubeSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setYoutubeSearchLoading(true);
    const result = await searchStreamingYouTubeVideos(youtubeSearchQuery);
    setYoutubeSearchLoading(false);
    if (result.error) {
      setError(result.error);
      setYoutubeSearchResults([]);
      return;
    }
    setYoutubeSearchResults(result.items);
  }

  async function openPlaylist(playlist: StreamingPlaylist) {
    if (!activeProvider) return;
    setSelectedPlaylist(playlist);
    setLoading(true);
    setError(null);
    const result = await fetchStreamingPlaylistItems(activeProvider, playlist.id);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      setItems([]);
      return;
    }
    setItems(result.items);
  }

  function handleAddItem(item: StreamingPlaylistItem) {
    setError(null);
    startTransition(async () => {
      const result = await addStreamingItemToLibrary({
        sourceUrl: item.sourceUrl,
        name: item.name,
        artist: item.artist,
        coverUrl: item.imageUrl,
        category: "ambient",
        isPublic: false,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.track) {
        onAdded(result.track);
        if (isOwner) {
          onPlay(result.track);
        } else {
          onRequest(result.track);
        }
      }
    });
  }

  function handleDisconnect(provider: StreamingMusicProvider) {
    startTransition(async () => {
      const result = await disconnectStreamingProvider(provider);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (activeProvider === provider) {
        setActiveProvider(null);
        setPlaylists([]);
        setItems([]);
        setSelectedPlaylist(null);
      }
      await refreshConnections();
    });
  }

  if (activeProvider && selectedPlaylist) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          onClick={() => {
            setSelectedPlaylist(null);
            setItems([]);
          }}
        >
          <ChevronLeft className="h-4 w-4" />
          Back to {PROVIDER_META[activeProvider].label} playlists
        </button>
        <h3 className="font-medium">{selectedPlaylist.name}</h3>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tracks in this playlist.
          </p>
        ) : (
          <StreamingItemList
            items={items}
            isOwner={isOwner}
            pending={pending}
            busy={busy}
            onAdd={handleAddItem}
          />
        )}
      </div>
    );
  }

  if (activeProvider) {
    const meta = PROVIDER_META[activeProvider];
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            onClick={() => {
              setActiveProvider(null);
              setPlaylists([]);
              setYoutubeSearchQuery("");
              setYoutubeSearchResults([]);
            }}
          >
            <ChevronLeft className="h-4 w-4" />
            Streaming services
          </button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-muted-foreground"
            disabled={busy}
            onClick={() => handleDisconnect(activeProvider)}
          >
            <LogOut className="h-3.5 w-3.5" />
            Disconnect
          </Button>
        </div>
        <h3 className="font-medium">{meta.label}</h3>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {activeProvider === "youtube_music" && (
          <form onSubmit={handleYoutubeSearch} className="flex gap-2">
            <Input
              type="search"
              placeholder="Search public YouTube videos…"
              value={youtubeSearchQuery}
              onChange={(e) => setYoutubeSearchQuery(e.target.value)}
              className="flex-1"
              maxLength={120}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="gap-1 shrink-0"
              disabled={youtubeSearchLoading || youtubeSearchQuery.trim().length < 2}
            >
              {youtubeSearchLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Search
            </Button>
          </form>
        )}

        {activeProvider === "youtube_music" && youtubeSearchResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Search results
            </p>
            <StreamingItemList
              items={youtubeSearchResults}
              isOwner={isOwner}
              pending={pending}
              busy={busy}
              onAdd={handleAddItem}
              maxHeight="max-h-[28vh]"
            />
          </div>
        )}

        {activeProvider === "youtube_music" && (
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Your playlists
          </p>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : playlists.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No playlists found on your account.
          </p>
        ) : (
          <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
            {playlists.map((playlist) => (
              <li key={playlist.id}>
                <button
                  type="button"
                  onClick={() => openPlaylist(playlist)}
                  className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted/50"
                >
                  {playlist.imageUrl ? (
                    <img
                      src={playlist.imageUrl}
                      alt=""
                      className="h-10 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                      <ListMusic className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{playlist.name}</p>
                    {playlist.trackCount != null && (
                      <p className="text-xs text-muted-foreground">
                        {playlist.trackCount} tracks
                      </p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        {(
          ["spotify", "youtube_music", "apple_music"] as StreamingMusicProvider[]
        ).map((provider) => {
          const meta = PROVIDER_META[provider];
          const conn = connectionByProvider[provider];
          const isConfigured = configured[provider];
          const isConnected = isConfigured && conn?.connected;

          function handleConnect() {
            if (!isConfigured) return;
            if (provider === "apple_music") {
              void handleAppleConnect();
              return;
            }
            handleOAuthConnect(provider);
          }

          return (
            <div
              key={provider}
              className="flex h-full flex-col gap-5 rounded-2xl border border-border/80 bg-muted/20 p-5"
            >
              <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={meta.iconSrc}
                  alt=""
                  className={cn(
                    "h-16 w-16 rounded-2xl object-cover shadow-lg ring-1 ring-white/10",
                    !isConfigured && "opacity-50 grayscale-[0.15]"
                  )}
                />
                <div className="min-w-0 w-full">
                  <p className="font-semibold">{meta.label}</p>
                  {isConnected && conn.displayName && (
                    <p className="mt-0.5 truncate px-1 text-xs text-muted-foreground">
                      {conn.displayName}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-auto flex flex-col gap-2">
                {isConnected ? (
                  <>
                    <Button
                      className={cn("h-10 w-full font-semibold", meta.buttonClass)}
                      disabled={busy}
                      onClick={() => openProvider(provider)}
                    >
                      <ListMusic className="h-4 w-4" />
                      Browse playlists
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full gap-1.5 text-muted-foreground hover:text-foreground"
                      disabled={busy}
                      onClick={() => handleDisconnect(provider)}
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Disconnect
                    </Button>
                  </>
                ) : (
                  <Button
                    className={cn(
                      "h-10 w-full font-semibold",
                      isConfigured ? meta.buttonClass : "opacity-45"
                    )}
                    disabled={
                      !isConfigured ||
                      busy ||
                      (provider === "apple_music" && appleConnecting)
                    }
                    onClick={handleConnect}
                  >
                    {provider === "apple_music" && appleConnecting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Connecting…
                      </>
                    ) : (
                      meta.connectLabel
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StreamingItemList({
  items,
  isOwner,
  pending,
  busy,
  onAdd,
  maxHeight = "max-h-[50vh]",
}: {
  items: StreamingPlaylistItem[];
  isOwner: boolean;
  pending: boolean;
  busy: boolean;
  onAdd: (item: StreamingPlaylistItem) => void;
  maxHeight?: string;
}) {
  return (
    <ul className={cn("space-y-2 overflow-y-auto", maxHeight)}>
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-center gap-3 rounded-lg border border-border p-3"
        >
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt=""
              className="h-10 w-10 rounded object-cover"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
              <Music2 className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.name}</p>
            {item.artist && (
              <p className="truncate text-xs text-muted-foreground">{item.artist}</p>
            )}
          </div>
          <Button
            size="sm"
            className="gap-1 shrink-0"
            disabled={pending || busy}
            onClick={() => onAdd(item)}
          >
            <Plus className="h-3.5 w-3.5" />
            {isOwner ? "Add & play" : "Add & request"}
          </Button>
        </li>
      ))}
    </ul>
  );
}
