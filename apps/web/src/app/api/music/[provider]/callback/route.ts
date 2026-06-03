import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { StreamingMusicProvider } from "@studyverce/shared";
import { getOAuthRedirectUri, resolveAppOrigin } from "@/lib/music/oauth-config";
import { consumeMusicOAuthState, safeReturnPath } from "@/lib/music/oauth-state";
import { upsertMusicConnection } from "@/lib/music/connection-store";
import { fetchSpotifyProfile } from "@/lib/music/spotify-api";
import { fetchYouTubeProfile } from "@/lib/music/youtube-api";

async function exchangeSpotifyCode(code: string, redirectUri: string) {
  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!res.ok) throw new Error("Spotify token exchange failed");
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  }>;
}

async function exchangeGoogleCode(code: string, redirectUri: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) throw new Error("Google token exchange failed");
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope?: string;
  }>;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider: raw } = await context.params;
  const provider = raw as StreamingMusicProvider;
  const appOrigin = resolveAppOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const stateRaw = searchParams.get("state");

  if (error || !code || !stateRaw) {
    return NextResponse.redirect(`${appOrigin}/rooms?music_error=auth_denied`);
  }

  let parsedState: { nonce: string; userId: string };
  try {
    parsedState = JSON.parse(Buffer.from(stateRaw, "base64url").toString()) as {
      nonce: string;
      userId: string;
    };
  } catch {
    return NextResponse.redirect(`${appOrigin}/rooms?music_error=invalid_state`);
  }

  const oauthState = await consumeMusicOAuthState(provider, parsedState.nonce);
  const returnTo = safeReturnPath(oauthState?.returnTo ?? "/rooms");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.id !== parsedState.userId) {
    return NextResponse.redirect(`${appOrigin}/auth/login?error=music_auth`);
  }

  try {
    const redirectUri = getOAuthRedirectUri(provider);
    const tokens =
      provider === "spotify"
        ? await exchangeSpotifyCode(code, redirectUri)
        : await exchangeGoogleCode(code, redirectUri);

    const profile =
      provider === "spotify"
        ? await fetchSpotifyProfile(tokens.access_token)
        : await fetchYouTubeProfile(tokens.access_token);

    await upsertMusicConnection(supabase, {
      userId: user.id,
      provider,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      scope: tokens.scope ?? null,
      providerAccountId: profile.id,
      displayName: profile.displayName,
    });

    const dest = new URL(returnTo, appOrigin);
    dest.searchParams.set("music_connected", provider);
    return NextResponse.redirect(dest.toString());
  } catch {
    const dest = new URL(returnTo, appOrigin);
    dest.searchParams.set("music_error", "connect_failed");
    return NextResponse.redirect(dest.toString());
  }
}
