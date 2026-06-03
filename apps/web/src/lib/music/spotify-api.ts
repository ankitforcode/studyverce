import type { StreamingPlaylist, StreamingPlaylistItem } from "@studyverce/shared";

const SPOTIFY_API = "https://api.spotify.com/v1";

async function spotifyFetch<T>(accessToken: string, path: string): Promise<T> {
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spotify API error: ${res.status} ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchSpotifyProfile(accessToken: string): Promise<{
  id: string;
  displayName: string;
}> {
  const data = await spotifyFetch<{ id: string; display_name: string | null }>(
    accessToken,
    "/me"
  );
  return {
    id: data.id,
    displayName: data.display_name ?? "Spotify user",
  };
}

export async function fetchSpotifyPlaylists(
  accessToken: string
): Promise<StreamingPlaylist[]> {
  const data = await spotifyFetch<{
    items: {
      id: string;
      name: string;
      description: string | null;
      tracks: { total: number };
      images: { url: string }[];
    }[];
  }>(accessToken, "/me/playlists?limit=50");

  return data.items.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    trackCount: p.tracks.total,
    imageUrl: p.images[0]?.url ?? null,
    provider: "spotify" as const,
  }));
}

export async function fetchSpotifyPlaylistItems(
  accessToken: string,
  playlistId: string
): Promise<StreamingPlaylistItem[]> {
  const data = await spotifyFetch<{
    items: {
      track: {
        id: string;
        name: string;
        duration_ms: number;
        artists: { name: string }[];
        external_urls: { spotify: string };
        album: { images: { url: string }[] };
      } | null;
    }[];
  }>(accessToken, `/playlists/${playlistId}/tracks?limit=50`);

  return data.items
    .filter((item) => item.track?.id)
    .map((item) => {
      const track = item.track!;
      return {
        id: track.id,
        name: track.name,
        artist: track.artists.map((a) => a.name).join(", ") || null,
        durationSeconds: Math.round(track.duration_ms / 1000),
        sourceUrl: track.external_urls.spotify,
        imageUrl: track.album.images[0]?.url ?? null,
        itemType: "track" as const,
      };
    });
}

export async function fetchSpotifySavedPlaylistsAsItems(
  accessToken: string
): Promise<StreamingPlaylistItem[]> {
  const playlists = await fetchSpotifyPlaylists(accessToken);
  return playlists.slice(0, 30).map((p) => ({
    id: p.id,
    name: p.name,
    artist: p.description,
    durationSeconds: p.trackCount,
    sourceUrl: `https://open.spotify.com/playlist/${p.id}`,
    imageUrl: p.imageUrl,
    itemType: "playlist" as const,
  }));
}
