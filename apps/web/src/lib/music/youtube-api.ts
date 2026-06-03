import type { StreamingPlaylist, StreamingPlaylistItem } from "@studyverce/shared";

const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

async function youtubeFetch<T>(
  accessToken: string,
  path: string,
  params: Record<string, string>
): Promise<T> {
  const url = new URL(`${YOUTUBE_API}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`YouTube API error: ${res.status} ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchYouTubeProfile(accessToken: string): Promise<{
  id: string;
  displayName: string;
}> {
  const data = await youtubeFetch<{
    items: { id: string; snippet: { title: string } }[];
  }>(accessToken, "/channels", { part: "snippet", mine: "true" });

  const channel = data.items[0];
  return {
    id: channel?.id ?? "youtube",
    displayName: channel?.snippet.title ?? "YouTube account",
  };
}

export async function fetchYouTubePlaylists(
  accessToken: string
): Promise<StreamingPlaylist[]> {
  const data = await youtubeFetch<{
    items: {
      id: string;
      snippet: {
        title: string;
        description: string;
        thumbnails: { default?: { url: string } };
      };
      contentDetails: { itemCount: number };
    }[];
  }>(accessToken, "/playlists", {
    part: "snippet,contentDetails",
    mine: "true",
    maxResults: "50",
  });

  return (data.items ?? []).map((p) => ({
    id: p.id,
    name: p.snippet.title,
    description: p.snippet.description || null,
    trackCount: p.contentDetails.itemCount,
    imageUrl: p.snippet.thumbnails.default?.url ?? null,
    provider: "youtube_music" as const,
  }));
}

export async function fetchYouTubePlaylistItems(
  accessToken: string,
  playlistId: string
): Promise<StreamingPlaylistItem[]> {
  const data = await youtubeFetch<{
    items: {
      snippet: {
        title: string;
        channelTitle: string;
        resourceId: { videoId: string };
        thumbnails: { default?: { url: string } };
      };
      contentDetails: { videoId: string };
    }[];
  }>(accessToken, "/playlistItems", {
    part: "snippet,contentDetails",
    playlistId,
    maxResults: "50",
  });

  const items: StreamingPlaylistItem[] = [];

  for (const item of data.items ?? []) {
    const videoId =
      item.contentDetails.videoId || item.snippet.resourceId.videoId;
    if (!videoId) continue;
    items.push({
      id: videoId,
      name: item.snippet.title,
      artist: item.snippet.channelTitle || null,
      durationSeconds: null,
      sourceUrl: `https://music.youtube.com/watch?v=${videoId}`,
      imageUrl: item.snippet.thumbnails.default?.url ?? null,
      itemType: "track",
    });
  }

  return items;
}

/** Search public YouTube videos (embeddable only, for room playback). */
export async function searchYouTubePublicVideos(
  accessToken: string,
  query: string,
  maxResults = 20
): Promise<StreamingPlaylistItem[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const data = await youtubeFetch<{
    items: {
      id: { videoId?: string };
      snippet: {
        title: string;
        channelTitle: string;
        thumbnails: { default?: { url: string }; medium?: { url: string } };
      };
    }[];
  }>(accessToken, "/search", {
    part: "snippet",
    type: "video",
    q,
    maxResults: String(Math.min(maxResults, 25)),
    videoEmbeddable: "true",
    safeSearch: "moderate",
  });

  const items: StreamingPlaylistItem[] = [];

  for (const row of data.items ?? []) {
    const videoId = row.id.videoId;
    if (!videoId) continue;
    items.push({
      id: videoId,
      name: row.snippet.title,
      artist: row.snippet.channelTitle || null,
      durationSeconds: null,
      sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
      imageUrl:
        row.snippet.thumbnails.medium?.url ??
        row.snippet.thumbnails.default?.url ??
        null,
      itemType: "track",
    });
  }

  return items;
}
