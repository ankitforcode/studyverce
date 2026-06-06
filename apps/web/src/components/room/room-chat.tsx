"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, MessageSquare, Send, Trash2 } from "lucide-react";
import type { ChatMessage } from "@studyverce/shared";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { ROOM_FIELD } from "@/lib/room-ui";
import { cn } from "@/lib/utils";

interface RoomChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  isModerator: boolean;
  onSend: (content: string) => void;
  onDelete: (messageId: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

export function RoomChat({
  messages,
  currentUserId,
  isModerator,
  onSend,
  onDelete,
  collapsed: collapsedProp,
  onCollapsedChange,
  className,
}: RoomChatProps) {
  const [collapsedInternal, setCollapsedInternal] = useState(false);
  const collapsed = collapsedProp ?? collapsedInternal;
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  function toggleCollapsed() {
    const next = !collapsed;
    if (collapsedProp === undefined) {
      setCollapsedInternal(next);
    }
    onCollapsedChange?.(next);
  }

  useEffect(() => {
    if (!collapsed) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, collapsed]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
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
            <p className="text-sm font-semibold">Room chat</p>
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
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1">
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
                      className={cn(
                        "inline-block rounded-2xl px-3 py-2 text-sm wrap-break-word text-left",
                        isOwn
                          ? "rounded-tr-sm bg-primary text-primary-foreground"
                          : "rounded-tl-sm bg-muted text-foreground"
                      )}
                    >
                      {msg.content}
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
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="flex shrink-0 gap-2 border-t border-border/50 pt-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              maxLength={2000}
              className={ROOM_FIELD}
            />
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
