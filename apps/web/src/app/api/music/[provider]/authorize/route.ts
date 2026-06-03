import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { StreamingMusicProvider } from "@studyverce/shared";
import {
  getOAuthRedirectUri,
  isStreamingProviderConfigured,
  resolveAppOrigin,
} from "@/lib/music/oauth-config";
import { setMusicOAuthState, safeReturnPath } from "@/lib/music/oauth-state";

const PROVIDERS: StreamingMusicProvider[] = ["spotify", "youtube_music", "apple_music"];

function buildAuthorizeUrl(
  provider: StreamingMusicProvider,
  state: string
): string {
  const redirectUri = getOAuthRedirectUri(provider);

  if (provider === "spotify") {
    const clientId = process.env.SPOTIFY_CLIENT_ID!;
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: [
        "playlist-read-private",
        "playlist-read-collaborative",
        "user-read-private",
        "user-read-email",
      ].join(" "),
      state,
    });
    return `https://accounts.spotify.com/authorize?${params}`;
  }

  if (provider === "youtube_music") {
    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: "https://www.googleapis.com/auth/youtube.readonly",
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  throw new Error("Apple Music uses in-app MusicKit authorization.");
}

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> }
) {
  const { provider: raw } = await context.params;
  const provider = raw as StreamingMusicProvider;

  if (!PROVIDERS.includes(provider)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  if (provider === "apple_music") {
    return NextResponse.json(
      { error: "Use the Connect Apple Music button in the room music picker." },
      { status: 400 }
    );
  }

  if (!isStreamingProviderConfigured(provider)) {
    return NextResponse.json(
      { error: `${provider} OAuth is not configured on this server.` },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const appOrigin = resolveAppOrigin(request);
    const incoming = new URL(request.url);
    const login = new URL("/auth/login", appOrigin);
    login.searchParams.set(
      "next",
      `${appOrigin}${incoming.pathname}${incoming.search}`
    );
    return NextResponse.redirect(login);
  }

  const { searchParams } = new URL(request.url);
  const returnTo = safeReturnPath(searchParams.get("returnTo"));
  const nonce = crypto.randomUUID();

  await setMusicOAuthState({ provider, returnTo, nonce });

  const state = Buffer.from(JSON.stringify({ nonce, userId: user.id })).toString(
    "base64url"
  );

  const url = buildAuthorizeUrl(provider, state);
  return NextResponse.redirect(url);
}
