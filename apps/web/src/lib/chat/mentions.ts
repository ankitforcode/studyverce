import {
  CHAT_MENTION_EVERYONE,
  CHAT_MENTION_HERE,
  isChatBroadcastMention,
  isParticipantOnlineForChatHere,
  type ChatBroadcastMention,
  type RoomParticipant,
} from "@studyverce/shared";

export type MentionQuery = {
  query: string;
  startIndex: number;
  endIndex: number;
};

export type MessagePart =
  | { type: "text"; value: string }
  | { type: "mention"; value: string };

export type MentionCandidate =
  | {
      kind: "broadcast";
      token: ChatBroadcastMention;
      label: string;
      description: string;
    }
  | { kind: "user"; participant: RoomParticipant };

const MENTION_BODY = /[a-z0-9_]/i;

const BROADCAST_OPTIONS: Array<{
  token: ChatBroadcastMention;
  label: string;
  description: string;
}> = [
  {
    token: CHAT_MENTION_HERE,
    label: "@here",
    description: "Notify everyone online",
  },
  {
    token: CHAT_MENTION_EVERYONE,
    label: "@everyone",
    description: "Notify everyone in the room",
  },
];

/** Active @mention being typed at the cursor (WhatsApp-style). */
export function getActiveMentionQuery(
  text: string,
  cursor: number
): MentionQuery | null {
  if (cursor < 0 || cursor > text.length) return null;

  const before = text.slice(0, cursor);
  const atIndex = before.lastIndexOf("@");
  if (atIndex === -1) return null;

  const charBeforeAt = atIndex === 0 ? " " : before[atIndex - 1];
  if (charBeforeAt !== " " && charBeforeAt !== "\n" && charBeforeAt !== "\t") {
    return null;
  }

  const query = before.slice(atIndex + 1);
  if (query.length > 0 && !MENTION_BODY.test(query[0]!)) {
    return null;
  }
  for (const ch of query) {
    if (!MENTION_BODY.test(ch)) return null;
  }

  return {
    query: query.toLowerCase(),
    startIndex: atIndex,
    endIndex: cursor,
  };
}

function filterBroadcastCandidates(query: string): MentionCandidate[] {
  const normalized = query.toLowerCase();

  return BROADCAST_OPTIONS.filter(
    (option) =>
      !normalized ||
      option.token.startsWith(normalized) ||
      option.label.slice(1).startsWith(normalized)
  ).map((option) => ({
    kind: "broadcast" as const,
    token: option.token,
    label: option.label,
    description: option.description,
  }));
}

export function filterMentionCandidates(
  participants: RoomParticipant[],
  query: string
): MentionCandidate[] {
  const normalized = query.toLowerCase();
  const broadcastMatches = filterBroadcastCandidates(normalized);

  const userMatches = participants
    .filter((participant) => {
      const username = participant.username.toLowerCase();
      const displayName = participant.displayName.toLowerCase();
      if (!normalized) return true;
      return username.includes(normalized) || displayName.includes(normalized);
    })
    .sort((a, b) => {
      const aUser = a.username.toLowerCase();
      const bUser = b.username.toLowerCase();
      const aStarts = normalized ? aUser.startsWith(normalized) : false;
      const bStarts = normalized ? bUser.startsWith(normalized) : false;
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return aUser.localeCompare(bUser);
    })
    .slice(0, 8)
    .map(
      (participant): MentionCandidate => ({
        kind: "user",
        participant,
      })
    );

  return [...broadcastMatches, ...userMatches].slice(0, 10);
}

export function insertMention(
  text: string,
  startIndex: number,
  endIndex: number,
  token: string
): { text: string; cursor: number } {
  const mention = `@${token} `;
  const nextText = text.slice(0, startIndex) + mention + text.slice(endIndex);
  return { text: nextText, cursor: startIndex + mention.length };
}

export function splitMessageMentions(
  content: string,
  knownUsernames: ReadonlySet<string>
): MessagePart[] {
  const parts: MessagePart[] = [];
  const pattern = /@([a-z0-9_]+)/gi;
  let lastIndex = 0;

  for (const match of content.matchAll(pattern)) {
    const index = match.index ?? 0;
    const token = match[1]?.toLowerCase() ?? "";

    if (index > lastIndex) {
      parts.push({ type: "text", value: content.slice(lastIndex, index) });
    }

    if (isChatBroadcastMention(token) || knownUsernames.has(token)) {
      parts.push({ type: "mention", value: token });
    } else {
      parts.push({ type: "text", value: match[0] ?? "" });
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: "text", value: content.slice(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ type: "text", value: content }];
}

export function collectMentionUsernames(
  participants: RoomParticipant[]
): Set<string> {
  return new Set([
    CHAT_MENTION_HERE,
    CHAT_MENTION_EVERYONE,
    ...participants.map((p) => p.username.toLowerCase()),
  ]);
}

export function countOnlineParticipants(
  participants: RoomParticipant[]
): number {
  return participants.filter(isParticipantOnlineForChatHere).length;
}
