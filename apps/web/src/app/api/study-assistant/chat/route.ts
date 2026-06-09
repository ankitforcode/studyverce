import { NextResponse } from "next/server";
import type { PlanTier } from "@studyverce/shared";
import { createClient } from "@/lib/supabase/server";
import { rateLimitOrNull } from "@/lib/rate-limit/route-guard";
import "@/lib/redis";
import {
  buildStudyAssistantLlmMessages,
  STUDY_ASSISTANT_MAX_CONTENT_LEN,
} from "@/lib/study-assistant-compliance";
import { getStudyAssistantPlanLimits } from "@/lib/study-assistant-limits";
import { consumeStudyAssistantPrompt } from "@/lib/study-assistant-quota";
import { stubStudyAssistantReply } from "@/lib/study-assistant";
import {
  chunkTextForStream,
  encodeStudyAssistantSse,
  extractOpenAiDeltaContent,
} from "@/lib/study-assistant-stream";
import { stripPostItHtml } from "@/lib/post-it-rich-text";
import { isUserRoomMember } from "@/lib/rooms/membership";

const MAX_MESSAGES = 24;

type ChatRequestBody = {
  roomId?: string;
  roomName?: string;
  goalText?: string;
  messages?: { role: "user" | "assistant"; content: string }[];
};

function streamResponse(
  handler: (
    push: (event: Parameters<typeof encodeStudyAssistantSse>[0]) => void
  ) => Promise<void>
) {
  const stream = new ReadableStream({
    async start(controller) {
      const push = (event: Parameters<typeof encodeStudyAssistantSse>[0]) => {
        controller.enqueue(encodeStudyAssistantSse(event));
      };

      try {
        await handler(push);
      } catch (err) {
        console.error("[study-assistant]", err);
        push({ type: "error", error: "Failed to reach AI service." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

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

  const roomId = body.roomId?.trim();
  if (!roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }

  const isMember = await isUserRoomMember(supabase, roomId, user.id);
  if (!isMember) {
    return NextResponse.json({ error: "Not a member of this room" }, { status: 403 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", user.id)
    .maybeSingle();

  const planTier = (profile?.plan_tier ?? "free") as PlanTier;
  const planLimits = getStudyAssistantPlanLimits(planTier);
  const memoryEnabled = planLimits.memoryEnabled;

  if (planLimits.dailyPromptLimit !== null) {
    const quota = await consumeStudyAssistantPrompt({
      userId: user.id,
      roomId,
      dailyPromptLimit: planLimits.dailyPromptLimit,
    });

    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: `Free plan limit reached: ${planLimits.dailyPromptLimit} study assistant prompts per room per day. Upgrade to Premium for unlimited messages and memory.`,
          code: "study_assistant_daily_limit",
          dailyPromptLimit: quota.status.dailyPromptLimit,
          dailyPromptsUsed: quota.status.dailyPromptsUsed,
          dailyPromptsRemaining: quota.status.dailyPromptsRemaining,
        },
        { status: 429 }
      );
    }
  }

  const goalText = memoryEnabled && body.goalText
    ? stripPostItHtml(body.goalText).trim()
    : undefined;

  const messageId = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const content = stubStudyAssistantReply(lastUser.content, {
      goalText,
      roomName: memoryEnabled ? body.roomName : undefined,
    });

    return streamResponse(async (push) => {
      push({
        type: "start",
        id: messageId,
        role: "assistant",
        createdAt,
      });

      for (const chunk of chunkTextForStream(content)) {
        push({ type: "delta", content: chunk });
      }

      push({ type: "done", provider: "stub" });
    });
  }

  const { system, messages: llmMessages } = buildStudyAssistantLlmMessages({
    history,
    roomName: body.roomName,
    goalText,
    memoryEnabled,
  });

  return streamResponse(async (push) => {
    push({
      type: "start",
      id: messageId,
      role: "assistant",
      createdAt,
    });

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
        stream: true,
        messages: [{ role: "system", content: system }, ...llmMessages],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[study-assistant] OpenAI error:", res.status, errText);
      push({
        type: "error",
        error: "AI service unavailable. Try again shortly.",
      });
      return;
    }

    if (!res.body) {
      push({ type: "error", error: "AI service unavailable. Try again shortly." });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let receivedContent = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const delta = extractOpenAiDeltaContent(line);
        if (delta) {
          receivedContent = true;
          push({ type: "delta", content: delta });
        }
      }
    }

    if (!receivedContent) {
      push({
        type: "delta",
        content: "I couldn't generate a reply. Please try again.",
      });
    }

    push({ type: "done", provider: "openai" });
  });
}
