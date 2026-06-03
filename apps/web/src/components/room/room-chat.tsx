"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Trash2 } from "lucide-react";
import type { ChatMessage } from "@studyverce/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface RoomChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  isModerator: boolean;
  onSend: (content: string) => void;
  onDelete: (messageId: string) => void;
  className?: string;
}

export function RoomChat({
  messages,
  currentUserId,
  isModerator,
  onSend,
  onDelete,
  className,
}: RoomChatProps) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  }

  return (
    <Card
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-none border-0 bg-transparent shadow-none",
        className
      )}
    >
      <CardHeader className="shrink-0 space-y-0.5 border-b border-border/50 px-4 py-3">
        <CardTitle className="text-base font-semibold">Room Chat</CardTitle>
        <p className="text-xs text-muted-foreground">Stay accountable with your study partners</p>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-4 pb-4 pt-3">
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-1">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm text-muted-foreground">No messages yet</p>
              <p className="mt-1 text-xs text-muted-foreground/70">Say hello to the room!</p>
            </div>
          )}
          {messages.map((msg) => {
            const isOwn = msg.userId === currentUserId;
            return (
              <div
                key={msg.id}
                className={cn("group flex gap-2", isOwn ? "justify-end" : "justify-start")}
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
                      {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
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

        <form onSubmit={handleSend} className="flex shrink-0 gap-2 border-t border-border/50 pt-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            maxLength={2000}
            className="bg-background/80"
          />
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
