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

function PresenceDot({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full ring-2 ring-card/80",
        isActive ? "bg-primary" : "bg-muted-foreground/50",
        "absolute bottom-0 right-0 h-2 w-2"
      )}
      title={isActive ? "Active" : "Away"}
    />
  );
}

export function ParticipantList({
  participants,
  currentUserId,
  variant = "card",
  className,
}: ParticipantListProps) {
  const activeCount = participants.filter((p) => p.isActive).length;

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
                  <PresenceDot isActive={p.isActive} />
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground truncate">
              {activeCount} active
              {participants.length > activeCount &&
                ` · ${participants.length - activeCount} away`}
              {participants.some((p) => p.userId === currentUserId && p.isActive) &&
                " · you're here"}
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
          <span className="text-sm font-normal text-muted-foreground">
            ({activeCount} active{participants.length > activeCount ? ` · ${participants.length} in room` : ""})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {participants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one here yet</p>
        ) : (
          <ul className="space-y-2">
            {participants.map((p) => (
              <li key={p.userId} className="flex items-center gap-2">
                <div className="relative">
                  <Avatar src={p.avatarUrl} fallback={p.displayName} size="sm" />
                  <PresenceDot isActive={p.isActive} />
                </div>
                <span className={cn("text-sm", !p.isActive && "text-muted-foreground")}>
                  {p.displayName}
                  {p.userId === currentUserId && (
                    <span className="text-muted-foreground ml-1">(you)</span>
                  )}
                  {!p.isActive && (
                    <span className="text-muted-foreground ml-1">· away</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
