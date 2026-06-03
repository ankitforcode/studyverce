"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setMessages(loadAssistantMessages(roomId));
  }, [roomId]);

  useEffect(() => {
    if (messages.length > 0) {
      saveAssistantMessages(roomId, messages);
    }
  }, [roomId, messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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

      const data = (await res.json()) as {
        error?: string;
        message?: StudyAssistantMessage;
      };

      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }

      if (data.message) {
        setMessages((prev) => [...prev, data.message!]);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError("Could not reach the assistant. Check your connection.");
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
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
  }

  function handleClear() {
    abortRef.current?.abort();
    setLoading(false);
    setMessages([]);
    setError(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(`studyverce-assistant-${roomId}`);
    }
  }

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
              Your Personal Study AI Coach
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
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-2">
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
                      disabled={loading}
                      onClick={() => void sendMessage(suggestion)}
                      className="rounded-xl border border-border/50 bg-card/30 px-3 py-2 text-left text-xs text-foreground transition-colors hover:border-primary/40 hover:bg-card/50"
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

              {loading && (
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
            <div ref={bottomRef} />
          </div>

          {error && (
            <p className="shrink-0 px-4 pb-1 text-xs text-destructive">{error}</p>
          )}

          <form
            onSubmit={handleSubmit}
            className="shrink-0 border-t border-border/50 bg-card/10 px-3 py-3"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-border/50 bg-background/80 p-2 shadow-sm">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message study assistant…"
                rows={1}
                disabled={loading}
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
                  disabled={!input.trim()}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40"
                  aria-label="Send message"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 px-1">
              <p className="text-[10px] text-muted-foreground">
                Enter to send · Shift+Enter for newline
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
