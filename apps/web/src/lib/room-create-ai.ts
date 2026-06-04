const STUB_NAMES = [
  "Midnight Focus Lab",
  "Deep Work Den",
  "Exam Crunch Crew",
  "Quiet Minds Union",
  "Flow State Lounge",
  "Library After Hours",
  "Caffeine & Calculus",
  "The Final Review",
] as const;

export function stubRoomNameSuggestions(): string[] {
  const shuffled = [...STUB_NAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
}

export function stubRoomDescription(roomName: string): string {
  const name = roomName.trim() || "this study room";
  return `Welcome to ${name} — a calm space to focus, share progress, and stay accountable. Use the pomodoro timer, keep goals on post-its, and chat when you need a quick boost.`;
}

export async function fetchOpenAiJson<T>(
  apiKey: string,
  system: string,
  user: string,
  model: string
): Promise<T | null> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      max_tokens: 400,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = data.choices?.[0]?.message?.content?.trim();
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
