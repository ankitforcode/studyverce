export type StudyAssistantRole = "user" | "assistant";

export interface StudyAssistantMessage {
  id: string;
  role: StudyAssistantRole;
  content: string;
  createdAt: string;
}

export function studyAssistantStorageKey(roomId: string) {
  return `studyverce-assistant-${roomId}`;
}

export function loadAssistantMessages(roomId: string): StudyAssistantMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(studyAssistantStorageKey(roomId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StudyAssistantMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveAssistantMessages(
  roomId: string,
  messages: StudyAssistantMessage[]
) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      studyAssistantStorageKey(roomId),
      JSON.stringify(messages.slice(-80))
    );
  } catch {
    /* quota */
  }
}

export const STUDY_ASSISTANT_SUGGESTIONS = [
  "Break my study goal into small steps",
  "Give me a 25-minute focus plan",
  "How do I recover after getting distracted?",
] as const;

/** Offline / no API key — short helpful replies. */
export function stubStudyAssistantReply(
  userMessage: string,
  context?: { goalText?: string; roomName?: string }
): string {
  const text = userMessage.trim().toLowerCase();
  const goal = context?.goalText?.replace(/<[^>]+>/g, "").trim();

  if (text.includes("step") || text.includes("break down") || text.includes("plan")) {
    const topic = goal || "your current topic";
    return [
      `Here's a simple plan for **${topic}**:`,
      "",
      "1. **2 min** — Write one sentence: what \"done\" looks like for this session.",
      "2. **20 min** — Work on the hardest part only (no tabs, no chat).",
      "3. **3 min** — Note one thing to pick up next time.",
      "",
      "Start the pomodoro when step 2 begins. You've got this.",
    ].join("\n");
  }

  if (text.includes("quiz") || text.includes("test me")) {
    return [
      "Quick check-in (answer out loud or in your notes):",
      "",
      `1. What is the main idea of ${goal || "what you're studying"}?`,
      "2. What is one thing you still find confusing?",
      "3. How would you explain it to a friend in 30 seconds?",
      "",
      "Reply with your answers and I'll suggest what to review next.",
    ].join("\n");
  }

  if (text.includes("focus") || text.includes("distract")) {
    return [
      "Try this focus reset:",
      "",
      "• Put your phone in another room or on Do Not Disturb.",
      "• One tab / one app — match it to your post-it goal.",
      "• Set a 25-minute timer and commit to only one sub-task.",
      "• When you slip, write the distraction on paper and return — no guilt spiral.",
      "",
      goal ? `Session goal: ${goal}` : "Set a goal on the pomodoro if you haven't yet.",
    ].join("\n");
  }

  return [
    context?.roomName
      ? `I'm your study assistant in **${context.roomName}**.`
      : "I'm your study assistant for this room.",
    "",
    goal ? `You're working on: ${goal}` : "Add a post-it or pomodoro goal for sharper advice.",
    "",
    "Ask me to break down a goal, plan a focus block, or quiz you. For full AI replies, your admin can set `OPENAI_API_KEY` on the server.",
  ].join("\n");
}
