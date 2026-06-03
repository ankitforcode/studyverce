"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROOM_HEADER_CONTROL } from "@/lib/room-ui";
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
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      title={label}
      onClick={onToggle}
      className={cn(
        ROOM_HEADER_CONTROL,
        "h-8 gap-1.5 px-2.5 hover:border-border/60 hover:bg-card/35",
        className
      )}
    >
      {isFullscreen ? (
        <Minimize2 className="h-3.5 w-3.5" />
      ) : (
        <Maximize2 className="h-3.5 w-3.5" />
      )}
      <span className="hidden font-medium sm:inline">
        {isFullscreen ? "Exit" : "Fullscreen"}
      </span>
    </Button>
  );
}
