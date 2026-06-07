export type StudyAssistantStreamEvent =
  | { type: "start"; id: string; role: "assistant"; createdAt: string }
  | { type: "delta"; content: string }
  | { type: "done"; provider: "openai" | "stub" }
  | { type: "error"; error: string };

export function encodeStudyAssistantSse(
  event: StudyAssistantStreamEvent
): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export function parseStudyAssistantSseChunk(
  chunk: string
): {
  events: StudyAssistantStreamEvent[];
  remainder: string;
} {
  const events: StudyAssistantStreamEvent[] = [];
  const parts = chunk.split("\n\n");
  const remainder = parts.pop() ?? "";

  for (const part of parts) {
    const line = part
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("data: "));
    if (!line) continue;

    try {
      events.push(JSON.parse(line.slice(6)) as StudyAssistantStreamEvent);
    } catch {
      /* ignore malformed frames */
    }
  }

  return { events, remainder };
}

export function* chunkTextForStream(text: string, size = 16): Generator<string> {
  for (let i = 0; i < text.length; i += size) {
    yield text.slice(i, i + size);
  }
}

export function extractOpenAiDeltaContent(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith("data: ")) return null;

  const payload = trimmed.slice(6);
  if (payload === "[DONE]") return null;

  try {
    const parsed = JSON.parse(payload) as {
      choices?: { delta?: { content?: string } }[];
    };
    const content = parsed.choices?.[0]?.delta?.content;
    return typeof content === "string" ? content : null;
  } catch {
    return null;
  }
}
