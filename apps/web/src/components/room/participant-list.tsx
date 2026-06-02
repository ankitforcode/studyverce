"use client";

import type { RoomParticipant } from "@studyverce/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ParticipantListProps {
  participants: RoomParticipant[];
  currentUserId: string;
  variant?: "card" | "compact";
  className?: string;
}

export function ParticipantList({
  participants,
  currentUserId,
  variant = "card",
  className,
}: ParticipantListProps) {
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2 min-w-0", className)}>
        <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
        {participants.length === 0 ? (
          <span className="text-xs text-muted-foreground">Just you</span>
        ) : (
          <>
            <div className="flex -space-x-2">
              {participants.slice(0, 6).map((p) => (
                <div key={p.userId} className="relative" title={p.displayName}>
                  <Avatar
                    src={p.avatarUrl}
                    fallback={p.displayName}
                    size="sm"
                    className="ring-2 ring-card/80"
                  />
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-primary ring-2 ring-card/80" />
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {participants.length} online
              {participants.some((p) => p.userId === currentUserId) && " · you're here"}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5" />
          Participants
          <span className="text-sm font-normal text-muted-foreground">({participants.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {participants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one here yet</p>
        ) : (
          <ul className="space-y-2">
            {participants.map((p) => (
              <li key={p.userId} className="flex items-center gap-2">
                <Avatar src={p.avatarUrl} fallback={p.displayName} size="sm" />
                <span className="text-sm">
                  {p.displayName}
                  {p.userId === currentUserId && (
                    <span className="text-muted-foreground ml-1">(you)</span>
                  )}
                </span>
                <span className="ml-auto h-2 w-2 rounded-full bg-primary" title="Online" />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
