"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  RoomTrack,
  StreamingMusicConnection,
  StreamingMusicProvider,
  StreamingPlaylist,
  StreamingPlaylistItem,
} from "@studyverce/shared";
import { parseMusicProviderUrl } from "@/lib/music/providers";
import {
  deleteMusicConnection,
  listConnectionStatuses,
} from "@/lib/music/connection-store";
import { loadConnectionWithFreshToken } from "@/lib/music/token-refresh";
import {
  fetchSpotifyPlaylistItems,
  fetchSpotifyPlaylists,
} from "@/lib/music/spotify-api";
import {
  fetchYouTubePlaylistItems,
  fetchYouTubePlaylists,
  searchYouTubePublicVideos,
} from "@/lib/music/youtube-api";
import {
  fetchAppleMusicPlaylistItems,
  fetchAppleMusicPlaylists,
} from "@/lib/music/apple-music-api";
import { isStreamingProviderConfigured } from "@/lib/music/oauth-config";
import {
  assertCanAddMusicLink,
  assertStreamingIntegrationAllowed,
} from "@/lib/music/plan-limits";

function mapTrack(row: {
  id: string;
  name: string;
  artist: string | null;
  audio_url: string;
  cover_url: string | null;
  duration_seconds: number | null;
  uploaded_by: string | null;
  is_public: boolean;
  is_builtin: boolean;
  category: string;
  provider?: string;
  external_id?: string | null;
  source_url?: string | null;
  created_at: string;
}): RoomTrack {
  return {
    id: row.id,
    name: row.name,
    artist: row.artist,
    audioUrl: row.audio_url,
    coverUrl: row.cover_url,
    durationSeconds: row.duration_seconds,
    uploadedBy: row.uploaded_by,
    isPublic: row.is_public,
    isBuiltin: row.is_builtin,
    category: row.category,
    provider: (row.provider ?? "direct") as RoomTrack["provider"],
    externalId: row.external_id ?? null,
    sourceUrl: row.source_url ?? null,
    createdAt: row.created_at,
  };
}

export async function getStreamingMusicConnections(): Promise<{
  connections: StreamingMusicConnection[];
  configured: Record<StreamingMusicProvider, boolean>;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const configured = {
    spotify: isStreamingProviderConfigured("spotify"),
    youtube_music: isStreamingProviderConfigured("youtube_music"),
    apple_music: isStreamingProviderConfigured("apple_music"),
  } as Record<StreamingMusicProvider, boolean>;

  if (!user) {
    return {
      connections: (["spotify", "youtube_music", "apple_music"] as const).map(
        (provider) => ({
          provider,
          connected: false,
          displayName: null,
          expiresAt: null,
        })
      ),
      configured,
    };
  }

  const statuses = await listConnectionStatuses(supabase, user.id);
  return {
    connections: statuses.map((s) => ({
      provider: s.provider,
      connected: s.connected,
      displayName: s.displayName,
      expiresAt: s.expiresAt,
    })),
    configured,
  };
}

export async function disconnectStreamingProvider(
  provider: StreamingMusicProvider
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  try {
    await deleteMusicConnection(supabase, user.id, provider);
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to disconnect",
    };
  }
}

export async function fetchStreamingPlaylists(
  provider: StreamingMusicProvider
): Promise<{ error: string | null; playlists: StreamingPlaylist[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated", playlists: [] };

  const streamingCheck = await assertStreamingIntegrationAllowed(supabase, user.id);
  if (!streamingCheck.ok) {
    return { error: streamingCheck.error, playlists: [] };
  }

  try {
    const conn = await loadConnectionWithFreshToken(supabase, user.id, provider);
    const playlists =
      provider === "spotify"
        ? await fetchSpotifyPlaylists(conn.accessToken)
        : provider === "youtube_music"
          ? await fetchYouTubePlaylists(conn.accessToken)
          : await fetchAppleMusicPlaylists(conn.accessToken);

    return { error: null, playlists };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to load playlists",
      playlists: [],
    };
  }
}

export async function fetchStreamingPlaylistItems(
  provider: StreamingMusicProvider,
  playlistId: string
): Promise<{ error: string | null; items: StreamingPlaylistItem[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated", items: [] };

  const streamingCheck = await assertStreamingIntegrationAllowed(supabase, user.id);
  if (!streamingCheck.ok) {
    return { error: streamingCheck.error, items: [] };
  }

  try {
    const conn = await loadConnectionWithFreshToken(supabase, user.id, provider);
    const items =
      provider === "spotify"
        ? await fetchSpotifyPlaylistItems(conn.accessToken, playlistId)
        : provider === "youtube_music"
          ? await fetchYouTubePlaylistItems(conn.accessToken, playlistId)
          : await fetchAppleMusicPlaylistItems(conn.accessToken, playlistId);

    return { error: null, items };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to load tracks",
      items: [],
    };
  }
}

export async function searchStreamingYouTubeVideos(
  query: string
): Promise<{ error: string | null; items: StreamingPlaylistItem[] }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated", items: [] };

  const streamingCheck = await assertStreamingIntegrationAllowed(supabase, user.id);
  if (!streamingCheck.ok) {
    return { error: streamingCheck.error, items: [] };
  }

  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { error: "Enter at least 2 characters to search.", items: [] };
  }

  try {
    const conn = await loadConnectionWithFreshToken(
      supabase,
      user.id,
      "youtube_music"
    );
    const items = await searchYouTubePublicVideos(conn.accessToken, trimmed);
    return { error: null, items };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "YouTube search failed",
      items: [],
    };
  }
}

export async function addStreamingItemToLibrary(input: {
  sourceUrl: string;
  name?: string;
  artist?: string | null;
  category?: string;
  isPublic?: boolean;
  coverUrl?: string | null;
}): Promise<{ error: string | null; track?: RoomTrack }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const streamingCheck = await assertStreamingIntegrationAllowed(supabase, user.id);
  if (!streamingCheck.ok) {
    return { error: streamingCheck.error };
  }

  const linkCheck = await assertCanAddMusicLink(supabase, user.id);
  if (!linkCheck.ok) {
    return { error: linkCheck.error };
  }

  const parsed = parseMusicProviderUrl(input.sourceUrl);
  if (!parsed) {
    return {
      error: "Could not parse this item for room playback. Try a track or playlist URL.",
    };
  }

  const name = input.name?.trim() || parsed.defaultName;
  const artist = input.artist?.trim() || null;
  const category = input.category?.trim() || "ambient";
  const isPublic = input.isPublic ?? false;

  const { data: track, error } = await supabase
    .from("room_tracks")
    .insert({
      name,
      artist,
      audio_url: parsed.embedUrl,
      cover_url: input.coverUrl ?? null,
      uploaded_by: user.id,
      is_public: isPublic,
      is_builtin: false,
      category,
      provider: parsed.provider,
      external_id: parsed.externalId,
      source_url: parsed.sourceUrl,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { error: null, track: mapTrack(track) };
}
