import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitOrNull } from "@/lib/rate-limit/route-guard";
import {
  buildStudyAssistantLlmMessages,
  STUDY_ASSISTANT_MAX_CONTENT_LEN,
} from "@/lib/study-assistant-compliance";
import {
  stubStudyAssistantReply,
  type StudyAssistantMessage,
} from "@/lib/study-assistant";
import { stripPostItHtml } from "@/lib/post-it-rich-text";

const MAX_MESSAGES = 24;

type ChatRequestBody = {
  roomId?: string;
  roomName?: string;
  goalText?: string;
  messages?: { role: "user" | "assistant"; content: string }[];
};

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

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const history = (body.messages ?? []).slice(-MAX_MESSAGES);
  const lastUser = [...history].reverse().find((m) => m.role === "user");

  if (!lastUser?.content?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  if (lastUser.content.length > STUDY_ASSISTANT_MAX_CONTENT_LEN) {
    return NextResponse.json({ error: "Message is too long" }, { status: 400 });
  }

  const goalText = body.goalText
    ? stripPostItHtml(body.goalText).trim()
    : undefined;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const content = stubStudyAssistantReply(lastUser.content, {
      goalText,
      roomName: body.roomName,
    });
    return NextResponse.json({
      message: {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content,
        createdAt: new Date().toISOString(),
      } satisfies StudyAssistantMessage,
      provider: "stub",
    });
  }

  const { system, messages: llmMessages } = buildStudyAssistantLlmMessages({
    history,
    roomName: body.roomName,
    goalText,
  });

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.5,
        max_tokens: 600,
        messages: [{ role: "system", content: system }, ...llmMessages],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[study-assistant] OpenAI error:", res.status, errText);
      return NextResponse.json(
        { error: "AI service unavailable. Try again shortly." },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content =
      data.choices?.[0]?.message?.content?.trim() ||
      "I couldn't generate a reply. Please try again.";

    return NextResponse.json({
      message: {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        content,
        createdAt: new Date().toISOString(),
      } satisfies StudyAssistantMessage,
      provider: "openai",
    });
  } catch (err) {
    console.error("[study-assistant]", err);
    return NextResponse.json(
      { error: "Failed to reach AI service." },
      { status: 502 }
    );
  }
}
