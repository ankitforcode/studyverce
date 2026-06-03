import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAppleDeveloperToken } from "@/lib/music/apple-developer-token";
import { isStreamingProviderConfigured } from "@/lib/music/oauth-config";

export async function GET() {
  if (!isStreamingProviderConfigured("apple_music")) {
    return NextResponse.json(
      { error: "Apple Music is not configured on this server." },
      { status: 503 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = createAppleDeveloperToken();
    return NextResponse.json({ developerToken: token });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Token generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
