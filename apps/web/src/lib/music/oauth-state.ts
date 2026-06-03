import { cookies } from "next/headers";
import type { StreamingMusicProvider } from "@studyverce/shared";
import { usesSecureOAuthCookies } from "@/lib/music/oauth-config";

const COOKIE_NAME = "music_oauth_state";
const MAX_AGE = 600;

export interface MusicOAuthState {
  provider: StreamingMusicProvider;
  returnTo: string;
  nonce: string;
}

export async function setMusicOAuthState(state: MusicOAuthState): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(state), {
    httpOnly: true,
    secure: usesSecureOAuthCookies(),
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function consumeMusicOAuthState(
  provider: StreamingMusicProvider,
  nonce: string
): Promise<MusicOAuthState | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  cookieStore.delete(COOKIE_NAME);

  if (!raw) return null;

  try {
    const state = JSON.parse(raw) as MusicOAuthState;
    if (state.provider !== provider || state.nonce !== nonce) return null;
    return state;
  } catch {
    return null;
  }
}

export function safeReturnPath(returnTo: string | null): string {
  if (!returnTo || !returnTo.startsWith("/")) return "/rooms";
  if (returnTo.startsWith("//")) return "/rooms";
  return returnTo;
}
