import type { StreamingPlaylist, StreamingPlaylistItem } from "@studyverce/shared";
import { createAppleDeveloperToken } from "@/lib/music/apple-developer-token";

const APPLE_API = "https://api.music.apple.com/v1";

async function appleFetch<T>(
  musicUserToken: string,
  path: string
): Promise<T> {
  const developerToken = createAppleDeveloperToken();
  const res = await fetch(`${APPLE_API}${path}`, {
    headers: {
      Authorization: `Bearer ${developerToken}`,
      "Music-User-Token": musicUserToken,
    },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apple Music API error: ${res.status} ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchAppleMusicPlaylists(
  musicUserToken: string
): Promise<StreamingPlaylist[]> {
  const data = await appleFetch<{
    data: {
      id: string;
      attributes: {
        name: string;
        description?: { standard?: string };
        trackCount?: number;
        artwork?: { url: string };
      };
    }[];
  }>(musicUserToken, "/me/library/playlists?limit=50");

  return (data.data ?? []).map((p) => {
    const artwork = p.attributes.artwork?.url?.replace("{w}x{h}", "200x200");
    return {
      id: p.id,
      name: p.attributes.name,
      description: p.attributes.description?.standard ?? null,
      trackCount: p.attributes.trackCount ?? null,
      imageUrl: artwork ?? null,
      provider: "apple_music" as const,
    };
  });
}

export async function fetchAppleMusicPlaylistItems(
  musicUserToken: string,
  playlistId: string
): Promise<StreamingPlaylistItem[]> {
  const data = await appleFetch<{
    data: {
      id: string;
      attributes: {
        name: string;
        artistName?: string;
        durationInMillis?: number;
        url: string;
        artwork?: { url: string };
      };
    }[];
  }>(musicUserToken, `/me/library/playlists/${playlistId}/tracks?limit=50`);

  return (data.data ?? []).map((t) => {
    const artwork = t.attributes.artwork?.url?.replace("{w}x{h}", "200x200");
    return {
      id: t.id,
      name: t.attributes.name,
      artist: t.attributes.artistName ?? null,
      durationSeconds: t.attributes.durationInMillis
        ? Math.round(t.attributes.durationInMillis / 1000)
        : null,
      sourceUrl: t.attributes.url,
      imageUrl: artwork ?? null,
      itemType: "track" as const,
    };
  });
}

export async function fetchAppleMusicStorefrontPlaylists(
  musicUserToken: string
): Promise<StreamingPlaylistItem[]> {
  const playlists = await fetchAppleMusicPlaylists(musicUserToken);
  return playlists.slice(0, 30).map((p) => ({
    id: p.id,
    name: p.name,
    artist: p.description,
    durationSeconds: p.trackCount,
    sourceUrl: `https://music.apple.com/library/playlist/${p.id}`,
    imageUrl: p.imageUrl,
    itemType: "playlist" as const,
  }));
}
