import type { StreamingMusicProvider } from "@studyverce/shared";

/** Public app origin for OAuth redirects (prefer NEXT_PUBLIC_APP_URL behind ngrok). */
export function getAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  return "http://localhost:3001";
}

/**
 * Origin for post-OAuth browser redirects. Ngrok forwards to localhost, so
 * `new URL(request.url).origin` is often http://localhost:3001 while cookies
 * and Google redirects use the public https ngrok host.
 */
export function resolveAppOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const proto = forwardedProto ?? "https";
    return `${proto}://${forwardedHost.split(",")[0]?.trim()}`;
  }

  return new URL(request.url).origin;
}

export function usesSecureOAuthCookies(): boolean {
  const origin = getAppOrigin();
  return origin.startsWith("https://");
}

export function getOAuthRedirectUri(provider: StreamingMusicProvider): string {
  return `${getAppOrigin()}/api/music/${provider}/callback`;
}

export function isStreamingProviderConfigured(provider: StreamingMusicProvider): boolean {
  switch (provider) {
    case "spotify":
      return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
    case "youtube_music":
      return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    case "apple_music":
      return !!(
        process.env.APPLE_MUSIC_TEAM_ID &&
        process.env.APPLE_MUSIC_KEY_ID &&
        process.env.APPLE_MUSIC_PRIVATE_KEY
      );
    default:
      return false;
  }
}
