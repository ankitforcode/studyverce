import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitOrNull } from "@/lib/rate-limit/route-guard";
import {
  fetchOpenAiJson,
  stubRoomDescription,
  stubRoomNameSuggestions,
} from "@/lib/room-create-ai";

type NamesResponse = { names?: string[] };
type DescriptionResponse = { description?: string };

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

  let body: { action?: string; name?: string };
  try {
    body = (await request.json()) as { action?: string; name?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  if (body.action === "names") {
    if (!apiKey) {
      return NextResponse.json({ names: stubRoomNameSuggestions() });
    }

    const parsed = await fetchOpenAiJson<NamesResponse>(
      apiKey,
      [
        "You suggest catchy, wholesome names for virtual group study rooms.",
        'Return JSON only: { "names": string[] } with exactly 5 unique names.',
        "Each name max 48 characters. No quotes inside names. Study vibes, not edgy.",
      ].join(" "),
      "Suggest 5 cool study room names.",
      model
    );

    const names = (parsed?.names ?? [])
      .map((n) => String(n).trim())
      .filter((n) => n.length > 0 && n.length <= 80)
      .slice(0, 5);

    return NextResponse.json({
      names: names.length > 0 ? names : stubRoomNameSuggestions(),
    });
  }

  if (body.action === "description") {
    const name = body.name?.trim();
    if (!name || name.length > 80) {
      return NextResponse.json({ error: "Room name is required" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ description: stubRoomDescription(name) });
    }

    const parsed = await fetchOpenAiJson<DescriptionResponse>(
      apiKey,
      [
        "You write short, inviting descriptions for virtual study rooms.",
        'Return JSON only: { "description": string }.',
        "One or two sentences, max 220 characters, warm and motivating, no hashtags.",
      ].join(" "),
      `Write a description for a study room named "${name}".`,
      model
    );

    const description =
      parsed?.description?.trim().slice(0, 500) ||
      stubRoomDescription(name);

    return NextResponse.json({ description });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
