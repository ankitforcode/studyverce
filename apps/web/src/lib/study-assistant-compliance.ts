import {
  buildStudyAssistantSystemPrompt,
  STUDY_ASSISTANT_RECENT_MESSAGE_COUNT,
} from "@/lib/study-assistant-prompt";

export const STUDY_ASSISTANT_MAX_CONTENT_LEN = 4000;

export type StudyAssistantChatTurn = {
  role: "user" | "assistant";
  content: string;
};

function truncateForSummary(text: string, max: number): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

/** Compress older turns into one short paragraph for the system prompt. */
export function summarizeStudyConversation(
  messages: StudyAssistantChatTurn[],
  options?: { goalText?: string }
): string {
  if (messages.length <= STUDY_ASSISTANT_RECENT_MESSAGE_COUNT) {
    return "";
  }

  const older = messages.slice(0, -STUDY_ASSISTANT_RECENT_MESSAGE_COUNT);
  const userTurns = older.filter((m) => m.role === "user");
  const assistantTurns = older.filter((m) => m.role === "assistant");
  const lastAssistant = assistantTurns[assistantTurns.length - 1];

  const topics = userTurns
    .slice(-3)
    .map((m) => truncateForSummary(m.content, 90))
    .join("; ");

  const parts = [
    options?.goalText
      ? `The student is working toward: ${truncateForSummary(options.goalText, 120)}.`
      : null,
    `Earlier session (${older.length} messages, ${userTurns.length} from student).`,
    topics
      ? `Main questions or topics raised: ${topics}.`
      : "The student exchanged a few study-related messages.",
    lastAssistant
      ? `Last coach reply before recent turns: ${truncateForSummary(lastAssistant.content, 140)}.`
      : null,
    "Use this summary for continuity; prioritize the recent messages below for detail.",
  ];

  const paragraph = parts.filter(Boolean).join(" ");
  return truncateForSummary(paragraph, 520);
}

export function buildStudyAssistantLlmMessages(options: {
  history: StudyAssistantChatTurn[];
  roomName?: string;
  goalText?: string;
  memoryEnabled?: boolean;
}): {
  system: string;
  messages: { role: "user" | "assistant"; content: string }[];
} {
  const memoryEnabled = options.memoryEnabled ?? true;
  const history = options.history.slice(-24);
  const effectiveHistory = memoryEnabled
    ? history
    : history.filter((message) => message.role === "user").slice(-1);
  const summary = memoryEnabled
    ? summarizeStudyConversation(history, {
        goalText: options.goalText,
      })
    : "";
  const recent = memoryEnabled
    ? history.slice(-STUDY_ASSISTANT_RECENT_MESSAGE_COUNT)
    : effectiveHistory;

  const system = buildStudyAssistantSystemPrompt({
    roomName: memoryEnabled ? options.roomName : undefined,
    goalText: memoryEnabled ? options.goalText : undefined,
    conversationSummary: summary,
    includeContext: memoryEnabled,
  });

  return {
    system,
    messages: recent.map((m) => ({
      role: m.role,
      content: m.content.slice(0, STUDY_ASSISTANT_MAX_CONTENT_LEN),
    })),
  };
}
