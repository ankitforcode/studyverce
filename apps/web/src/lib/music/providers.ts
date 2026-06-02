import type { MusicProvider } from "@studyverse/shared";

export interface ParsedProviderTrack {
  provider: MusicProvider;
  externalId: string;
  sourceUrl: string;
  embedUrl: string;
  audioUrl: string;
  defaultName: string;
}

function normalizeUrl(raw: string): URL | null {
  try {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(withProtocol);
  } catch {
    return null;
  }
}

function parseYouTube(url: URL): ParsedProviderTrack | null {
  let videoId: string | null = null;

  if (url.hostname === "youtu.be") {
    videoId = url.pathname.slice(1).split("/")[0] || null;
  } else if (
    url.hostname.includes("youtube.com") ||
    url.hostname.includes("music.youtube.com")
  ) {
    videoId = url.searchParams.get("v");
  }

  if (!videoId) return null;

  const sourceUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&controls=0&modestbranding=1&rel=0`;

  return {
    provider: "youtube",
    externalId: videoId,
    sourceUrl,
    embedUrl,
    audioUrl: embedUrl,
    defaultName: "YouTube track",
  };
}

function parseSoundCloud(url: URL): ParsedProviderTrack | null {
  if (!url.hostname.includes("soundcloud.com")) return null;

  const sourceUrl = url.toString();
  const embedUrl = `https://w.soundcloud.com/player/?url=${encodeURIComponent(sourceUrl)}&auto_play=true&hide_related=true&show_comments=false&visual=false`;

  return {
    provider: "soundcloud",
    externalId: sourceUrl,
    sourceUrl,
    embedUrl,
    audioUrl: embedUrl,
    defaultName: "SoundCloud track",
  };
}

function parseSpotify(url: URL): ParsedProviderTrack | null {
  if (!url.hostname.includes("spotify.com")) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length < 2) return null;

  const [type, id] = parts;
  if (!["track", "playlist", "album", "episode"].includes(type) || !id) return null;

  const sourceUrl = `https://open.spotify.com/${type}/${id}`;
  const embedUrl = `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&autoplay=true`;

  return {
    provider: "spotify",
    externalId: `${type}:${id}`,
    sourceUrl,
    embedUrl,
    audioUrl: embedUrl,
    defaultName: `Spotify ${type}`,
  };
}

export function parseMusicProviderUrl(raw: string): ParsedProviderTrack | null {
  const url = normalizeUrl(raw);
  if (!url) return null;

  return parseYouTube(url) ?? parseSoundCloud(url) ?? parseSpotify(url);
}

export const PROVIDER_LABELS: Record<MusicProvider, string> = {
  builtin: "StudyVerse",
  youtube: "YouTube",
  soundcloud: "SoundCloud",
  spotify: "Spotify",
  direct: "Direct",
};

export function isEmbedProvider(provider: MusicProvider | null | undefined): boolean {
  return provider === "youtube" || provider === "soundcloud" || provider === "spotify";
}
