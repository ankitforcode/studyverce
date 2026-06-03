import type { StreamingMusicProvider } from "@studyverce/shared";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import {
  getMusicConnection,
  upsertMusicConnection,
  type StoredMusicConnection,
} from "@/lib/music/connection-store";

async function refreshSpotifyToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
  refreshToken?: string;
}> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Spotify is not configured.");
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error("Spotify token refresh failed. Please reconnect your account.");
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  return {
    accessToken: json.access_token,
    expiresAt: new Date(Date.now() + json.expires_in * 1000),
    refreshToken: json.refresh_token,
  };
}

async function refreshGoogleToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresAt: Date;
}> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("YouTube Music (Google) is not configured.");
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error("Google token refresh failed. Please reconnect your account.");
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };

  return {
    accessToken: json.access_token,
    expiresAt: new Date(Date.now() + json.expires_in * 1000),
  };
}

export async function getValidAccessToken(
  supabase: TypedSupabaseClient,
  connection: StoredMusicConnection
): Promise<string> {
  const { provider, accessToken, refreshToken, expiresAt, userId } = connection;

  if (provider === "apple_music") {
    return accessToken;
  }

  const stillValid =
    expiresAt && new Date(expiresAt).getTime() > Date.now() + 60_000;

  if (stillValid) return accessToken;

  if (!refreshToken) {
    throw new Error("Session expired. Please reconnect your music account.");
  }

  let nextAccessToken: string;
  let nextExpiresAt: Date;
  let nextRefreshToken = refreshToken;

  if (provider === "spotify") {
    const spotify = await refreshSpotifyToken(refreshToken);
    nextAccessToken = spotify.accessToken;
    nextExpiresAt = spotify.expiresAt;
    if (spotify.refreshToken) nextRefreshToken = spotify.refreshToken;
  } else {
    const google = await refreshGoogleToken(refreshToken);
    nextAccessToken = google.accessToken;
    nextExpiresAt = google.expiresAt;
  }

  await upsertMusicConnection(supabase, {
    userId,
    provider,
    accessToken: nextAccessToken,
    refreshToken: nextRefreshToken,
    expiresAt: nextExpiresAt,
  });

  return nextAccessToken;

}

export async function loadConnectionWithFreshToken(
  supabase: TypedSupabaseClient,
  userId: string,
  provider: StreamingMusicProvider
): Promise<StoredMusicConnection & { accessToken: string }> {
  const connection = await getMusicConnection(supabase, userId, provider);
  if (!connection) {
    throw new Error(`Connect your ${provider.replace("_", " ")} account first.`);
  }

  const accessToken = await getValidAccessToken(supabase, connection);
  return { ...connection, accessToken };
}
