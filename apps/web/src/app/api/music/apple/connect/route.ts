import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { upsertMusicConnection } from "@/lib/music/connection-store";
import { rateLimitOrNull } from "@/lib/rate-limit/route-guard";

export async function POST(request: Request) {
  const limited = await rateLimitOrNull(request);
  if (limited) return limited;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    musicUserToken?: string;
    displayName?: string;
  };

  if (!body.musicUserToken?.trim()) {
    return NextResponse.json({ error: "Missing music user token" }, { status: 400 });
  }

  await upsertMusicConnection(supabase, {
    userId: user.id,
    provider: "apple_music",
    accessToken: body.musicUserToken.trim(),
    refreshToken: null,
    expiresAt: null,
    displayName: body.displayName?.trim() || "Apple Music",
  });

  return NextResponse.json({ success: true });
}
