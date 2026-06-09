"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import {
  Megaphone,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Mic,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import type { ChatMessage, RoomParticipant } from "@studyverce/shared";
import { filterParticipantsForViewer } from "@studyverce/shared";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  collectMentionUsernames,
  filterMentionCandidates,
  getActiveMentionQuery,
  insertMention,
  splitMessageMentions,
  type MentionCandidate,
} from "@/lib/chat/mentions";
import { formatDistanceToNow } from "date-fns";
import { ROOM_FIELD, ROOM_INNER_SURFACE } from "@/lib/room-ui";
import { cn } from "@/lib/utils";

interface RoomChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  participants?: RoomParticipant[];
  isModerator: boolean;
  onSend: (content: string) => void;
  onDelete: (messageId: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
  voiceNotesEnabled?: boolean;
  voiceRecordPending?: boolean;
  onStartVoiceRecord?: () => void;
}

function ChatMessageBody({
  content,
  mentionUsernames,
  isOwn,
}: {
  content: string;
  mentionUsernames: ReadonlySet<string>;
  isOwn: boolean;
}) {
  const parts = splitMessageMentions(content, mentionUsernames);

  return (
    <>
      {parts.map((part, index) =>
        part.type === "mention" ? (
          <span
            key={`${index}-${part.value}`}
            className={cn(
              "font-semibold",
              isOwn ? "text-primary-foreground underline decoration-primary-foreground/50" : "text-primary"
            )}
          >
            @{part.value}
          </span>
        ) : (
          <span key={`${index}-text`}>{part.value}</span>
        )
      )}
    </>
  );
}

export function RoomChat({
  messages,
  currentUserId,
  participants = [],
  isModerator,
  onSend,
  onDelete,
  collapsed: collapsedProp,
  onCollapsedChange,
  className,
  voiceNotesEnabled = false,
  voiceRecordPending = false,
  onStartVoiceRecord,
}: RoomChatProps) {
  const [collapsedInternal, setCollapsedInternal] = useState(false);
  const collapsed = collapsedProp ?? collapsedInternal;
  const [input, setInput] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionDismissed, setMentionDismissed] = useState(false);
  const [inputCursor, setInputCursor] = useState(0);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleParticipants = useMemo(
    () => filterParticipantsForViewer(participants, currentUserId),
    [participants, currentUserId]
  );
  const mentionUsernames = useMemo(
    () => collectMentionUsernames(visibleParticipants),
    [visibleParticipants]
  );

  const activeMention = useMemo(
    () => getActiveMentionQuery(input, inputCursor),
    [input, inputCursor]
  );
  const mentionCandidates = useMemo(() => {
    if (!activeMention) return [];
    return filterMentionCandidates(visibleParticipants, activeMention.query);
  }, [activeMention, visibleParticipants]);
  const mentionPickerOpen =
    !mentionDismissed &&
    Boolean(activeMention) &&
    mentionCandidates.length > 0;

  function toggleCollapsed() {
    const next = !collapsed;
    if (collapsedProp === undefined) {
      setCollapsedInternal(next);
    }
    onCollapsedChange?.(next);
  }

  useEffect(() => {
    if (collapsed) return;
    const container = messagesScrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, collapsed]);

  useEffect(() => {
    setMentionIndex(0);
    setMentionDismissed(false);
  }, [activeMention?.query, activeMention?.startIndex]);

  const syncInputCursor = useCallback(() => {
    const cursor = inputRef.current?.selectionStart;
    if (cursor != null) {
      setInputCursor(cursor);
    }
  }, []);

  const applyMention = useCallback(
    (candidate: MentionCandidate) => {
      if (!activeMention) return;

      const token =
        candidate.kind === "broadcast"
          ? candidate.token
          : candidate.participant.username;

      const { text, cursor } = insertMention(
        input,
        activeMention.startIndex,
        activeMention.endIndex,
        token
      );
      setInput(text);
      setInputCursor(cursor);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (!el) return;
        el.focus();
        el.setSelectionRange(cursor, cursor);
      });
    },
    [activeMention, input]
  );

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
    setInputCursor(0);
  }

  function handleInputChange(value: string) {
    setInput(value);
    requestAnimationFrame(syncInputCursor);
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!mentionPickerOpen) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setMentionIndex((prev) =>
        prev + 1 >= mentionCandidates.length ? 0 : prev + 1
      );
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setMentionIndex((prev) =>
        prev - 1 < 0 ? mentionCandidates.length - 1 : prev - 1
      );
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      const selected = mentionCandidates[mentionIndex];
      if (selected) {
        applyMention(selected);
      }
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setMentionDismissed(true);
      return;
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col",
        collapsed ? "shrink-0" : "h-full min-h-0 flex-1 basis-0",
        className
      )}
    >
      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex w-full shrink-0 items-center justify-between gap-2 px-4 py-3 text-left transition-colors hover:bg-muted/25"
        aria-expanded={!collapsed}
      >
        <div className="flex min-w-0 items-center gap-2">
          <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Room chat</p>
            <p className="truncate text-xs text-muted-foreground">
              {messages.length === 0
                ? "Stay accountable with your study partners"
                : `${messages.length} message${messages.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      {!collapsed && (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 pb-4 pt-1">
          <div
            ref={messagesScrollRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-muted-foreground">No messages yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Say hello to the room!
                </p>
              </div>
            )}
            {messages.map((msg) => {
              const isOwn = msg.userId === currentUserId;
              return (
                <div
                  key={msg.id}
                  className={cn(
                    "group flex gap-2",
                    isOwn ? "justify-end" : "justify-start"
                  )}
                >
                  {!isOwn && (
                    <Avatar
                      src={msg.avatarUrl}
                      fallback={msg.displayName}
                      size="sm"
                      className="mt-0.5 shrink-0"
                    />
                  )}
                  <div className={cn("min-w-0 max-w-[80%]", isOwn && "text-right")}>
                    <div
                      className={cn(
                        "mb-0.5 flex items-baseline gap-2",
                        isOwn && "justify-end"
                      )}
                    >
                      <span className="text-xs font-medium">{msg.displayName}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {(isModerator || isOwn) && (
                        <button
                          type="button"
                          onClick={() => onDelete(msg.id)}
                          className="text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                          aria-label="Delete message"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <p
                      data-ph-mask
                      className={cn(
                        "inline-block rounded-2xl px-3 py-2 text-sm wrap-break-word text-left",
                        isOwn
                          ? "rounded-tr-sm bg-primary text-primary-foreground"
                          : "rounded-tl-sm bg-muted text-foreground"
                      )}
                    >
                      <ChatMessageBody
                        content={msg.content}
                        mentionUsernames={mentionUsernames}
                        isOwn={isOwn}
                      />
                    </p>
                  </div>
                  {isOwn && (
                    <Avatar
                      src={msg.avatarUrl}
                      fallback={msg.displayName}
                      size="sm"
                      className="mt-0.5 shrink-0"
                    />
                  )}
                </div>
              );
            })}
          </div>

          <form
            onSubmit={handleSend}
            className="flex shrink-0 gap-2 border-t border-border/50 pt-3"
          >
            <div className="relative min-w-0 flex-1">
              {mentionPickerOpen && (
                <div
                  role="listbox"
                  aria-label="Mention a participant"
                  className={cn(
                    "absolute bottom-full left-0 right-0 z-20 mb-1 max-h-44 overflow-y-auto rounded-lg border border-border/60 p-1 shadow-lg",
                    ROOM_INNER_SURFACE
                  )}
                >
                  {mentionCandidates.map((candidate, index) => (
                    <button
                      key={
                        candidate.kind === "broadcast"
                          ? `broadcast-${candidate.token}`
                          : candidate.participant.userId
                      }
                      type="button"
                      role="option"
                      aria-selected={index === mentionIndex}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                        index === mentionIndex
                          ? "bg-primary/15 text-foreground"
                          : "text-foreground hover:bg-muted/50"
                      )}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        applyMention(candidate);
                      }}
                    >
                      {candidate.kind === "broadcast" ? (
                        <>
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                            {candidate.token === "here" ? (
                              <Megaphone className="h-3.5 w-3.5" aria-hidden />
                            ) : (
                              <Users className="h-3.5 w-3.5" aria-hidden />
                            )}
                          </span>
                          <span className="min-w-0 flex-1 truncate">
                            <span className="font-medium">{candidate.label}</span>
                            <span className="text-muted-foreground">
                              {" "}
                              · {candidate.description}
                            </span>
                          </span>
                        </>
                      ) : (
                        <>
                          <Avatar
                            src={candidate.participant.avatarUrl}
                            fallback={candidate.participant.displayName}
                            size="sm"
                            className="h-7 w-7 shrink-0 text-[10px]"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            <span className="font-medium">
                              @{candidate.participant.username}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              · {candidate.participant.displayName}
                            </span>
                          </span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {onStartVoiceRecord && (
                <PostItIconTooltip
                  label={
                    voiceNotesEnabled
                      ? "Record voice note"
                      : "Voice notes (Premium)"
                  }
                  side="top"
                  align="start"
                  className="absolute left-2 top-1/2 z-10 -translate-y-1/2"
                >
                  <button
                    type="button"
                    onClick={onStartVoiceRecord}
                    disabled={!voiceNotesEnabled || voiceRecordPending}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      voiceNotesEnabled
                        ? "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        : "cursor-not-allowed text-muted-foreground/50"
                    )}
                    aria-label={
                      voiceNotesEnabled
                        ? "Record voice note"
                        : "Voice notes require Premium"
                    }
                  >
                    <Mic className="h-4 w-4" />
                  </button>
                </PostItIconTooltip>
              )}
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onKeyUp={syncInputCursor}
                onClick={syncInputCursor}
                onSelect={syncInputCursor}
                placeholder="Type a message… @user, @here, or @everyone"
                maxLength={2000}
                className={cn(onStartVoiceRecord && "pl-10", ROOM_FIELD)}
              />
            </div>
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
