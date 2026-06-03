import type { MusicProvider } from "@studyverce/shared";

/** Providers that support in-place pause/resume without remounting the embed. */
export function supportsEmbedTransport(provider: MusicProvider | null | undefined): boolean {
  return provider === "youtube" || provider === "soundcloud";
}

export function getYouTubeEmbedSrc(
  embedUrl: string,
  options: { autoplay: boolean; origin?: string }
): string {
  try {
    const url = new URL(embedUrl);
    const videoId =
      url.pathname.split("/").filter(Boolean).pop() ?? url.searchParams.get("v");
    if (!videoId) return embedUrl;

    const params = new URLSearchParams({
      autoplay: options.autoplay ? "1" : "0",
      loop: "1",
      playlist: videoId,
      controls: "0",
      modestbranding: "1",
      rel: "0",
      enablejsapi: "1",
    });
    if (options.origin) {
      params.set("origin", options.origin);
    }
    return `https://www.youtube.com/embed/${videoId}?${params}`;
  } catch {
    return embedUrl;
  }
}

export function getSoundCloudEmbedSrc(embedUrl: string, autoplay: boolean): string {
  try {
    const url = new URL(embedUrl);
    url.searchParams.set("auto_play", autoplay ? "true" : "false");
    return url.toString();
  } catch {
    return embedUrl;
  }
}

export function getSpotifyEmbedSrc(embedUrl: string, autoplay: boolean): string {
  try {
    const url = new URL(embedUrl);
    if (autoplay) {
      url.searchParams.set("autoplay", "true");
    } else {
      url.searchParams.delete("autoplay");
    }
    return url.toString();
  } catch {
    return embedUrl;
  }
}

export function resolveEmbedSrc(
  embedUrl: string,
  provider: MusicProvider | null | undefined,
  options: { autoplay: boolean; origin?: string }
): string {
  if (!embedUrl) return embedUrl;
  switch (provider) {
    case "youtube":
      return getYouTubeEmbedSrc(embedUrl, options);
    case "soundcloud":
      return getSoundCloudEmbedSrc(embedUrl, options.autoplay);
    case "spotify":
      return getSpotifyEmbedSrc(embedUrl, options.autoplay);
    default:
      return embedUrl;
  }
}

export function postEmbedCommand(
  iframe: HTMLIFrameElement | null,
  provider: MusicProvider | null | undefined,
  command: "play" | "pause"
): boolean {
  if (!iframe?.contentWindow) return false;

  try {
    if (provider === "youtube") {
      const func = command === "play" ? "playVideo" : "pauseVideo";
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args: "" }),
        "*"
      );
      return true;
    }
    if (provider === "soundcloud") {
      const method = command === "play" ? "play" : "pause";
      iframe.contentWindow.postMessage(
        JSON.stringify({ method }),
        "*"
      );
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

/** YouTube volume is 0–100; other embeds may ignore this. */
export function postEmbedVolume(
  iframe: HTMLIFrameElement | null,
  provider: MusicProvider | null | undefined,
  volumePercent: number
): boolean {
  if (!iframe?.contentWindow || provider !== "youtube") return false;

  try {
    iframe.contentWindow.postMessage(
      JSON.stringify({
        event: "command",
        func: "setVolume",
        args: [Math.round(Math.max(0, Math.min(100, volumePercent)))],
      }),
      "*"
    );
    return true;
  } catch {
    return false;
  }
}
