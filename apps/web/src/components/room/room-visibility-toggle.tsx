"use client";

import { useState, useTransition } from "react";
import { Globe, Lock } from "lucide-react";
import { setRoomVisibility } from "@/app/rooms/access-actions";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import { Button } from "@/components/ui/button";
import type { AppSocket } from "@/hooks/use-socket";
import { ROOM_HEADER_ICON_BUTTON } from "@/lib/room-ui";
import { cn } from "@/lib/utils";

interface RoomVisibilityToggleProps {
  roomId: string;
  isPublic: boolean;
  socket: AppSocket | null;
  onVisibilityChange: (isPublic: boolean, inviteToken: string | null) => void;
  className?: string;
}

export function RoomVisibilityToggle({
  roomId,
  isPublic,
  socket,
  onVisibilityChange,
  className,
}: RoomVisibilityToggleProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const nextPublic = !isPublic;
      const result = await setRoomVisibility(roomId, nextPublic);
      if (result.error) {
        setError(result.error);
        return;
      }
      const inviteToken = result.inviteToken ?? null;
      onVisibilityChange(nextPublic, inviteToken);
      socket?.emit("room:visibility:set", {
        roomId,
        isPublic: nextPublic,
        inviteToken,
      });
    });
  }

  const label = isPublic ? "Make private" : "Make public";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <PostItIconTooltip label={label} side="bottom">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          aria-label={label}
          onClick={handleToggle}
          className={ROOM_HEADER_ICON_BUTTON}
        >
          {isPublic ? (
            <Lock className="h-3.5 w-3.5" />
          ) : (
            <Globe className="h-3.5 w-3.5" />
          )}
        </Button>
      </PostItIconTooltip>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
