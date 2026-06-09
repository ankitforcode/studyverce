"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Square,
  ArrowUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  loadAssistantMessages,
  saveAssistantMessages,
  STUDY_ASSISTANT_SUGGESTIONS,
  type StudyAssistantMessage,
} from "@/lib/study-assistant";
import { parseStudyAssistantSseChunk } from "@/lib/study-assistant-stream";

type AssistantLimits = {
  planTier: string;
  memoryEnabled: boolean;
  dailyPromptLimit: number | null;
  dailyPromptsUsed: number;
  dailyPromptsRemaining: number | null;
};

interface RoomStudyAssistantProps {
  roomId: string;
  roomName: string;
  goalText?: string;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

function formatAssistantContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part.split("\n").map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 ? <br /> : null}
      </span>
    ));
  });
}

export function RoomStudyAssistant({
  roomId,
  roomName,
  goalText,
  collapsed: collapsedProp,
  onCollapsedChange,
  className,
}: RoomStudyAssistantProps) {
  const [collapsedInternal, setCollapsedInternal] = useState(false);
  const collapsed = collapsedProp ?? collapsedInternal;

  function toggleCollapsed() {
    const next = !collapsed;
    if (collapsedProp === undefined) {
      setCollapsedInternal(next);
    }
    onCollapsedChange?.(next);
  }
  const [messages, setMessages] = useState<StudyAssistantMessage[]>([]);
  const [limits, setLimits] = useState<AssistantLimits | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refreshLimits = useCallback(async () => {
    try {
      const res = await fetch(`/api/study-assistant/limits?roomId=${encodeURIComponent(roomId)}`);
      if (!res.ok) return;
      const data = (await res.json()) as AssistantLimits;
      setLimits(data);
      return data;
    } catch {
      return null;
    }
  }, [roomId]);

  useEffect(() => {
    void refreshLimits().then((data) => {
      if (data?.memoryEnabled) {
        setMessages(loadAssistantMessages(roomId));
      } else {
        setMessages([]);
      }
    });
  }, [roomId, refreshLimits]);

  useEffect(() => {
    if (limits?.memoryEnabled && messages.length > 0) {
      saveAssistantMessages(roomId, messages);
    }
  }, [roomId, messages, limits?.memoryEnabled]);

  useEffect(() => {
    if (collapsed) return;
    const container = messagesScrollRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages, loading, streamingMessageId, collapsed]);

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    if (limits?.dailyPromptsRemaining === 0) {
      setError("Daily prompt limit reached for this room. Upgrade to Premium for unlimited AI.");
      return;
    }

    setError(null);
    const userMessage: StudyAssistantMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setStreamingMessageId(null);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/study-assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          roomId,
          roomName,
          goalText,
          messages: nextMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const contentType = res.headers.get("content-type") ?? "";

      if (!res.ok) {
        const data = (await res.json()) as {
          error?: string;
          dailyPromptsRemaining?: number;
        };
        setError(data.error ?? "Something went wrong");
        if (typeof data.dailyPromptsRemaining === "number") {
          setLimits((prev) =>
            prev
              ? {
                  ...prev,
                  dailyPromptsRemaining: data.dailyPromptsRemaining ?? 0,
                  dailyPromptsUsed: prev.dailyPromptLimit
                    ? prev.dailyPromptLimit - (data.dailyPromptsRemaining ?? 0)
                    : prev.dailyPromptsUsed,
                }
              : prev
          );
        } else {
          void refreshLimits();
        }
        return;
      }

      if (!contentType.includes("text/event-stream") || !res.body) {
        setError("Unexpected response from assistant.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const { events, remainder } = parseStudyAssistantSseChunk(buffer);
        buffer = remainder;

        for (const event of events) {
          if (event.type === "start") {
            assistantId = event.id;
            setStreamingMessageId(event.id);
            setMessages((prev) => [
              ...prev,
              {
                id: event.id,
                role: "assistant",
                content: "",
                createdAt: event.createdAt,
              },
            ]);
          } else if (event.type === "delta" && assistantId) {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantId
                  ? {
                      ...message,
                      content: message.content + event.content,
                    }
                  : message
              )
            );
          } else if (event.type === "error") {
            setError(event.error);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Could not reach the assistant. Check your connection.");
      }
    } finally {
      setLoading(false);
      setStreamingMessageId(null);
      abortRef.current = null;
      void refreshLimits();
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setLoading(false);
    setStreamingMessageId(null);
  }

  function handleClear() {
    abortRef.current?.abort();
    setLoading(false);
    setStreamingMessageId(null);
    setMessages([]);
    setError(null);
    if (limits?.memoryEnabled && typeof window !== "undefined") {
      sessionStorage.removeItem(`studyverce-assistant-${roomId}`);
    }
  }

  const limitReached = limits?.dailyPromptsRemaining === 0;
  const showFreePlanNotice =
    limits && !limits.memoryEnabled && limits.dailyPromptLimit !== null;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-col border-b border-border/50",
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
          <Sparkles className="h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Study assistant</p>
            <p className="truncate text-xs text-muted-foreground">
              {limits?.memoryEnabled
                ? "Unlimited messages with memory"
                : limits?.dailyPromptLimit
                  ? `${limits.dailyPromptsRemaining ?? limits.dailyPromptLimit}/${limits.dailyPromptLimit} prompts left today`
                  : "Your Personal Study AI Coach"}
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
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div
            ref={messagesScrollRef}
            className="min-h-0 flex-1 overflow-y-auto px-3 pb-2"
          >
            {showFreePlanNotice && (
              <p className="mx-1 mb-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                Free plan: each prompt is standalone with no conversation memory or post-it
                context.{" "}
                <Link href="/plans" className="text-primary underline-offset-4 hover:underline">
                  Upgrade to Premium
                </Link>{" "}
                for unlimited messages and memory.
              </p>
            )}

            {messages.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center gap-3 px-2 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Ask for a study plan, focus tips, or a quick quiz.
                </p>
                <div className="flex w-full flex-col gap-2">
                  {STUDY_ASSISTANT_SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={loading || limitReached}
                      onClick={() => void sendMessage(suggestion)}
                      className="rounded-xl border border-border/50 bg-card/30 px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-card/50 light:bg-white/90 light:hover:bg-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4 py-2">
              {messages.map((msg) =>
                msg.role === "user" ? (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[92%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                      <p className="whitespace-pre-wrap wrap-break-word text-left">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div key={msg.id} className="flex gap-2">
                    <div
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
                      aria-hidden
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">
                      {formatAssistantContent(msg.content)}
                    </div>
                  </div>
                )
              )}

              {loading && !streamingMessageId && (
                <div className="flex gap-2">
                  <div
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
                    aria-hidden
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex items-center gap-1.5 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking…
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && (
            <p className="shrink-0 px-4 pb-1 text-xs text-destructive">{error}</p>
          )}

          <form
            onSubmit={handleSubmit}
            className="shrink-0 border-t border-border/50 bg-card/10 px-3 py-3 light:bg-white/70"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-border/50 bg-background/80 p-2 shadow-sm light:bg-white light:border-border/90">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  limitReached
                    ? "Daily prompt limit reached"
                    : "Message study assistant…"
                }
                rows={1}
                disabled={loading || limitReached}
                maxLength={4000}
                className="max-h-[120px] min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-60"
              />
              {loading ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors hover:bg-muted/80"
                  aria-label="Stop generating"
                >
                  <Square className="h-4 w-4 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || limitReached}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 px-1">
              <p className="text-[10px] text-muted-foreground">
                {limitReached
                  ? "Upgrade on the Plans page for unlimited AI"
                  : "Enter to send · Shift+Enter for newline"}
              </p>
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[10px] text-muted-foreground hover:text-foreground"
                >
                  Clear chat
                </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
