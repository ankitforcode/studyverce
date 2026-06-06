"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { PostItIconTooltip } from "@/components/dashboard/post-it-icon-tooltip";
import { Button } from "@/components/ui/button";
import { ROOM_HEADER_ICON_BUTTON } from "@/lib/room-ui";
import { cn } from "@/lib/utils";

interface RoomFullscreenToggleProps {
  isFullscreen: boolean;
  onToggle: () => void;
  className?: string;
}

export function RoomFullscreenToggle({
  isFullscreen,
  onToggle,
  className,
}: RoomFullscreenToggleProps) {
  const label = isFullscreen ? "Exit fullscreen" : "Enter fullscreen";

  return (
    <PostItIconTooltip label={label} side="bottom">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-label={label}
        onClick={onToggle}
        className={cn(ROOM_HEADER_ICON_BUTTON, className)}
      >
        {isFullscreen ? (
          <Minimize2 className="h-3.5 w-3.5" />
        ) : (
          <Maximize2 className="h-3.5 w-3.5" />
        )}
      </Button>
    </PostItIconTooltip>
  );
}
